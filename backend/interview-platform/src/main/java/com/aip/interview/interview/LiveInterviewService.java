package com.aip.interview.interview;

import com.aip.interview.interview.dto.InterviewDtos.Question;
import com.aip.interview.interview.dto.InterviewDtos.SubmitAnswersRequest;
import com.aip.interview.interview.dto.InterviewDtos.SubmitAnswersRequest.AnswerItem;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Live conversational turns (ARCHITECTURE.md §5, synchronous path):
 * browser ⇄ this SSE proxy ⇄ ai-gateway token stream. Java stays the
 * workflow owner — it merges answers, bounds follow-ups, advances the
 * question cursor and triggers the (async, Kafka) evaluation at the end.
 */
@Service
public class LiveInterviewService {

    private static final Logger log = LoggerFactory.getLogger(LiveInterviewService.class);
    private static final int MAX_FOLLOW_UPS_PER_QUESTION = 1;

    public record TurnBody(String kind, String text) {
    }

    private record LiveState(int currentIndex, int followUpsUsed) {
    }

    private record TurnContext(String gatewayRequestJson, boolean alreadyFinished) {
    }

    private final InterviewSessionRepository sessions;
    private final InterviewService interviewService;
    private final TransactionTemplate tx;
    private final ObjectMapper json;
    private final HttpClient httpClient;
    private final ExecutorService executor = Executors.newCachedThreadPool();
    private final String gatewayBaseUrl;

    public LiveInterviewService(InterviewSessionRepository sessions,
                                InterviewService interviewService,
                                TransactionTemplate tx,
                                ObjectMapper json,
                                @Value("${aip.ai-gateway.base-url:http://127.0.0.1:8090}") String gatewayBaseUrl) {
        this.sessions = sessions;
        this.interviewService = interviewService;
        this.tx = tx;
        this.json = json;
        this.gatewayBaseUrl = gatewayBaseUrl;
        // HTTP/1.1 pinned: uvicorn rejects the default h2c upgrade attempt.
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(3))
                .build();
    }

    public SseEmitter handleTurn(UUID userId, UUID sessionId, String candidateName, TurnBody body) {
        SseEmitter emitter = new SseEmitter(120_000L);
        // Captured on the request thread — the executor has no tracing context.
        String traceparent = interviewService.currentTraceparent();
        executor.submit(() -> {
            try {
                TurnContext context = tx.execute(status -> prepareTurn(userId, sessionId, candidateName, body));
                if (context == null) {
                    throw new IllegalStateException("Turn preparation failed");
                }
                if (context.alreadyFinished()) {
                    sendControl(emitter, "complete", sessionId);
                    emitter.complete();
                    return;
                }
                streamFromGateway(emitter, userId, sessionId, traceparent, context.gatewayRequestJson());
                emitter.complete();
            } catch (ResponseStatusException e) {
                fail(emitter, e.getReason() == null ? "Request rejected." : e.getReason());
            } catch (Exception e) {
                log.error("Live turn failed for session {}", sessionId, e);
                fail(emitter, "The interviewer is unavailable right now. Please retry.");
            }
        });
        return emitter;
    }

    /* ---------- Transactional preparation: merge answer, snapshot state ---------- */

    private TurnContext prepareTurn(UUID userId, UUID sessionId, String candidateName, TurnBody body) {
        InterviewSession session = sessions.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Interview session not found."));

        if (session.getStatus() != InterviewSession.Status.IN_PROGRESS) {
            return new TurnContext(null, true);
        }

        List<Question> questions = fromJson(session.getQuestions(), new TypeReference<List<Question>>() {});
        LiveState state = session.getLiveState() == null
                ? new LiveState(0, 0)
                : fromJson(session.getLiveState(), new TypeReference<LiveState>() {});

        boolean isAnswer = "answer".equals(body.kind());
        if (isAnswer) {
            mergeAnswer(session, questions.size(), state.currentIndex(), body.text());
        } else if (session.getLiveState() == null) {
            session.updateLiveState(toJson(state));
        }

        Question current = questions.get(state.currentIndex());
        Question next = state.currentIndex() + 1 < questions.size() ? questions.get(state.currentIndex() + 1) : null;

        ObjectNode request = json.createObjectNode();
        request.put("sessionId", session.getId().toString());
        request.put("kind", isAnswer ? "answer" : "start");
        request.put("candidateName", candidateName);
        request.put("technology", session.getTechnology());
        request.set("question", json.valueToTree(current));
        request.set("nextQuestion", next == null ? json.nullNode() : json.valueToTree(next));
        request.put("answerText", isAnswer ? body.text() : "");
        request.put("followUpsUsed", state.followUpsUsed());
        request.put("followUpEnabled", state.followUpsUsed() < MAX_FOLLOW_UPS_PER_QUESTION);
        request.put("questionNumber", state.currentIndex() + 1);
        request.put("totalQuestions", questions.size());
        return new TurnContext(toJson(request), false);
    }

    private void mergeAnswer(InterviewSession session, int questionCount, int index, String text) {
        List<AnswerItem> answers = session.getAnswers() == null
                ? new ArrayList<>()
                : new ArrayList<>(fromJson(session.getAnswers(), new TypeReference<List<AnswerItem>>() {}));
        while (answers.size() < questionCount) {
            answers.add(new AnswerItem(answers.size(), ""));
        }
        String existing = answers.get(index).text();
        String merged = existing == null || existing.isBlank() ? text : existing + "\n\n" + text;
        answers.set(index, new AnswerItem(index, merged));
        session.recordAnswers(toJson(answers));
    }

    /* ---------- Gateway stream forwarding ---------- */

    private void streamFromGateway(SseEmitter emitter, UUID userId, UUID sessionId,
                                   String traceparent, String requestJson) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(gatewayBaseUrl + "/v1/interview-turns"))
                .timeout(Duration.ofSeconds(90))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                .build();

        HttpResponse<java.util.stream.Stream<String>> response =
                httpClient.send(request, HttpResponse.BodyHandlers.ofLines());
        if (response.statusCode() != 200) {
            throw new IllegalStateException("ai-gateway turn endpoint returned " + response.statusCode());
        }

        String[] currentEvent = {null};
        response.body().forEach(line -> {
            try {
                if (line.startsWith("event: ")) {
                    currentEvent[0] = line.substring(7).trim();
                } else if (line.startsWith("data: ")) {
                    String data = line.substring(6);
                    if ("control".equals(currentEvent[0])) {
                        String action = json.readTree(data).path("action").asText();
                        tx.executeWithoutResult(status -> applyControl(userId, sessionId, action, traceparent));
                        sendControl(emitter, action, sessionId);
                    } else {
                        emitter.send(SseEmitter.event().name("token").data(data));
                    }
                }
            } catch (Exception e) {
                throw new IllegalStateException("Failed forwarding stream", e);
            }
        });
    }

    /* ---------- Transactional control application ---------- */

    private void applyControl(UUID userId, UUID sessionId, String action, String traceparent) {
        InterviewSession session = sessions.findByIdAndUserId(sessionId, userId).orElseThrow();
        if (session.getStatus() != InterviewSession.Status.IN_PROGRESS) {
            return; // idempotent: already finished
        }
        LiveState state = session.getLiveState() == null
                ? new LiveState(0, 0)
                : fromJson(session.getLiveState(), new TypeReference<LiveState>() {});

        switch (action) {
            case "follow-up" ->
                    session.updateLiveState(toJson(new LiveState(state.currentIndex(), state.followUpsUsed() + 1)));
            case "next" ->
                    session.updateLiveState(toJson(new LiveState(state.currentIndex() + 1, 0)));
            case "complete" -> {
                List<AnswerItem> answers = session.getAnswers() == null
                        ? List.of(new AnswerItem(0, ""))
                        : fromJson(session.getAnswers(), new TypeReference<List<AnswerItem>>() {});
                // Reuses the standard submit path: state transition + outbox event
                // → Kafka → async evaluation. One pipeline, both entry modes.
                interviewService.submit(userId, sessionId, new SubmitAnswersRequest(answers), traceparent);
            }
            default -> { /* 'ask' — no state change */ }
        }
    }

    private void sendControl(SseEmitter emitter, String action, UUID sessionId) {
        try {
            ObjectNode control = json.createObjectNode();
            control.put("action", action);
            control.put("sessionId", sessionId.toString());
            emitter.send(SseEmitter.event().name("control").data(toJson(control)));
        } catch (Exception e) {
            log.warn("Failed to send control event: {}", e.getMessage());
        }
    }

    private void fail(SseEmitter emitter, String message) {
        try {
            ObjectNode error = json.createObjectNode();
            error.put("message", message);
            emitter.send(SseEmitter.event().name("error").data(toJson(error)));
            emitter.complete();
        } catch (Exception ignored) {
            emitter.completeWithError(new IllegalStateException(message));
        }
    }

    private String toJson(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException("JSON serialization failed", e);
        }
    }

    private <T> T fromJson(String raw, TypeReference<T> type) {
        try {
            return json.readValue(raw, type);
        } catch (Exception e) {
            throw new IllegalStateException("JSON deserialization failed", e);
        }
    }
}

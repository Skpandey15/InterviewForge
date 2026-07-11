package com.aip.interview.interview;

import com.aip.interview.interview.dto.InterviewDtos.ResultResponse;
import com.aip.interview.interview.dto.InterviewDtos.SessionResponse;
import com.aip.interview.interview.dto.InterviewDtos.StartInterviewRequest;
import com.aip.interview.interview.dto.InterviewDtos.SubmitAnswersRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/interviews")
public class InterviewController {

    private final InterviewService interviews;
    private final LiveInterviewService liveInterviews;

    public InterviewController(InterviewService interviews, LiveInterviewService liveInterviews) {
        this.interviews = interviews;
        this.liveInterviews = liveInterviews;
    }

    /** Live conversational turn — SSE token stream from the AI interviewer. */
    @PostMapping(value = "/{sessionId}/turns", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter turn(@AuthenticationPrincipal Jwt jwt,
                           @PathVariable("sessionId") UUID sessionId,
                           @RequestBody LiveInterviewService.TurnBody body) {
        String name = jwt.getClaimAsString("name");
        return liveInterviews.handleTurn(
                UUID.fromString(jwt.getSubject()),
                sessionId,
                name == null ? "there" : name.split(" ")[0],
                body);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SessionResponse start(@AuthenticationPrincipal Jwt jwt,
                                 @Valid @RequestBody StartInterviewRequest request) {
        return interviews.start(UUID.fromString(jwt.getSubject()), request);
    }

    @GetMapping("/{sessionId}")
    public SessionResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable("sessionId") UUID sessionId) {
        return interviews.getSession(UUID.fromString(jwt.getSubject()), sessionId);
    }

    @PostMapping("/{sessionId}/submit")
    public ResultResponse submit(@AuthenticationPrincipal Jwt jwt,
                                 @PathVariable("sessionId") UUID sessionId,
                                 @Valid @RequestBody SubmitAnswersRequest request) {
        return interviews.submit(UUID.fromString(jwt.getSubject()), sessionId, request);
    }

    @GetMapping("/{sessionId}/result")
    public ResultResponse result(@AuthenticationPrincipal Jwt jwt, @PathVariable("sessionId") UUID sessionId) {
        return interviews.getResult(UUID.fromString(jwt.getSubject()), sessionId);
    }

    @GetMapping("/history")
    public List<ResultResponse> history(@AuthenticationPrincipal Jwt jwt) {
        return interviews.history(UUID.fromString(jwt.getSubject()));
    }
}

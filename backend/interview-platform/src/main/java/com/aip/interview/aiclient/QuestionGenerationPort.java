package com.aip.interview.aiclient;

import com.aip.interview.interview.dto.InterviewDtos.Question;

import java.util.List;

/** Port: how the interview module obtains a question set. */
public interface QuestionGenerationPort {

    GeneratedQuestionSet generate(String technology, String level, String difficulty, int count);

    /**
     * @param source "ai-gateway" (grounded generation) or "fallback-bank"
     *               (curated static set used when the gateway is unavailable —
     *               the AI dependency degrades, the product does not).
     */
    record GeneratedQuestionSet(List<Question> questions, String source, double coverageScore) {
    }
}

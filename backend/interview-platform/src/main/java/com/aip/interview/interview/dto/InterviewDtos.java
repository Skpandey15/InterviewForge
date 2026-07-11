package com.aip.interview.interview.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public final class InterviewDtos {

    private InterviewDtos() {
    }

    public record StartInterviewRequest(
            @NotBlank String technology,
            @NotBlank String level,
            @NotBlank String difficulty,
            @Min(1) @Max(30) int questionCount) {
    }

    public record Question(int index, String text, List<String> sourceRefs, List<String> idealAnswerPoints) {
    }

    public record SessionResponse(
            String id,
            String status,
            String technology,
            String level,
            String difficulty,
            String questionSource,
            List<Question> questions) {
    }

    public record SubmitAnswersRequest(@NotEmpty List<AnswerItem> answers) {

        public record AnswerItem(@Min(0) int index, String text) {
        }
    }

    public record CriterionScore(String key, String label, int score) {
    }

    public record ResultResponse(
            String id,
            String status,
            String technology,
            String level,
            String createdAt,
            Integer overallScore,
            Boolean passed,
            String performanceLabel,
            List<CriterionScore> criteria,
            List<String> strengths,
            List<String> improvements) {
    }
}

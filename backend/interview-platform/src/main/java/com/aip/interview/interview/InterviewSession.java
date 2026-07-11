package com.aip.interview.interview;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Aggregate root for one interview run. State transitions are enforced here —
 * an illegal transition is a bug in the caller, not a 500 to debug later.
 */
@Entity
@Table(name = "interview_sessions")
public class InterviewSession {

    public enum Status { CONFIGURED, IN_PROGRESS, SUBMITTED, EVALUATING, EVALUATED, ABORTED }

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String technology;

    @Column(nullable = false)
    private String level;

    @Column(nullable = false)
    private String difficulty;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    /** JSON array of Question — text, sourceRefs, idealAnswerPoints. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private String questions;

    /** JSON array of answers keyed by question index. */
    @JdbcTypeCode(SqlTypes.JSON)
    private String answers;

    @Column(name = "question_source", nullable = false)
    private String questionSource;

    @Column(name = "overall_score")
    private Integer overallScore;

    private Boolean passed;

    @Column(name = "performance_label")
    private String performanceLabel;

    /** JSON: criteria scores + strengths + improvements from the evaluation event. */
    @JdbcTypeCode(SqlTypes.JSON)
    private String evaluation;

    /** JSON: live-turn cursor {currentIndex, followUpsUsed} while IN_PROGRESS. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "live_state")
    private String liveState;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "evaluated_at")
    private Instant evaluatedAt;

    protected InterviewSession() {
        // JPA
    }

    public InterviewSession(UUID userId, String technology, String level, String difficulty,
                            String questionsJson, String questionSource) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.technology = technology;
        this.level = level;
        this.difficulty = difficulty;
        this.questions = questionsJson;
        this.questionSource = questionSource;
        this.status = Status.IN_PROGRESS;
        this.createdAt = Instant.now();
    }

    public void recordAnswers(String answersJson) {
        requireStatus(Status.IN_PROGRESS, "record answers");
        this.answers = answersJson;
    }

    public void updateLiveState(String liveStateJson) {
        requireStatus(Status.IN_PROGRESS, "update live state");
        this.liveState = liveStateJson;
    }

    public String getLiveState() {
        return liveState;
    }

    public void submit() {
        requireStatus(Status.IN_PROGRESS, "submit");
        if (answers == null) {
            throw new IllegalStateException("Cannot submit a session without answers");
        }
        this.status = Status.SUBMITTED;
        this.submittedAt = Instant.now();
    }

    public void markEvaluating() {
        requireStatus(Status.SUBMITTED, "start evaluation");
        this.status = Status.EVALUATING;
    }

    public void applyEvaluation(int overallScore, boolean passed, String performanceLabel, String evaluationJson) {
        if (status != Status.SUBMITTED && status != Status.EVALUATING) {
            throw new IllegalStateException("Cannot apply evaluation in status " + status);
        }
        this.overallScore = overallScore;
        this.passed = passed;
        this.performanceLabel = performanceLabel;
        this.evaluation = evaluationJson;
        this.status = Status.EVALUATED;
        this.evaluatedAt = Instant.now();
    }

    private void requireStatus(Status expected, String action) {
        if (status != expected) {
            throw new IllegalStateException("Cannot " + action + " in status " + status);
        }
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getTechnology() {
        return technology;
    }

    public String getLevel() {
        return level;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public Status getStatus() {
        return status;
    }

    public String getQuestions() {
        return questions;
    }

    public String getAnswers() {
        return answers;
    }

    public String getQuestionSource() {
        return questionSource;
    }

    public Integer getOverallScore() {
        return overallScore;
    }

    public Boolean getPassed() {
        return passed;
    }

    public String getPerformanceLabel() {
        return performanceLabel;
    }

    public String getEvaluation() {
        return evaluation;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}

package com.aip.auth.user;

public enum Role {
    ADMIN,
    /** Sets up and runs interviews and judges candidates. Promoted by an admin. */
    INTERVIEWER,
    CANDIDATE
}

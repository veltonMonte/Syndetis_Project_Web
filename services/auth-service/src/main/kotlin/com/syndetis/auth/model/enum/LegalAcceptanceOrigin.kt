package com.syndetis.auth.model.enum

/** Where a merchant accepted the legal texts. */
enum class LegalAcceptanceOrigin {
    /** The checkbox on the e-mail and password signup form. */
    SIGNUP,

    /** The acceptance screen inside the app: first Google/GitHub sign-in, or a newer version of the texts. */
    IN_APP,
}

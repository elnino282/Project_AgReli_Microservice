CREATE TABLE document_user_interactions (
    user_id BIGINT NOT NULL,
    document_id INT NOT NULL,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    favorited_at DATETIME(6) NULL,
    last_opened_at DATETIME(6) NULL,
    open_count INT NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (user_id, document_id),
    CONSTRAINT fk_document_user_interaction_document
        FOREIGN KEY (document_id) REFERENCES admin_documents(document_id) ON DELETE CASCADE,
    INDEX idx_document_interaction_favorites (user_id, is_favorite, favorited_at),
    INDEX idx_document_interaction_recent (user_id, last_opened_at)
);

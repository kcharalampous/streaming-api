-- CreateIndex: covers unfiltered list queries sorted by createdAt DESC
CREATE INDEX "streaming_content_created_at_idx" ON "streaming_content"("created_at" DESC);

-- CreateIndex: covers genre-filtered list queries sorted by createdAt DESC
CREATE INDEX "streaming_content_genre_created_at_idx" ON "streaming_content"("genre", "created_at" DESC);

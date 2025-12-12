-- CreateIndex
CREATE INDEX "PickupItem_pickupId_idx" ON "PickupItem"("pickupId");

-- CreateIndex
CREATE INDEX "PickupItem_categoryId_idx" ON "PickupItem"("categoryId");

-- CreateIndex
CREATE INDEX "PickupRequest_residentId_idx" ON "PickupRequest"("residentId");

-- CreateIndex
CREATE INDEX "PickupRequest_assignedCollectorId_idx" ON "PickupRequest"("assignedCollectorId");

-- CreateIndex
CREATE INDEX "PickupRequest_status_idx" ON "PickupRequest"("status");

-- CreateIndex
CREATE INDEX "PickupRequest_createdAt_idx" ON "PickupRequest"("createdAt");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

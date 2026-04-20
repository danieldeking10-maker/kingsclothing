# Kings Clothing Security Specification

## Data Invariants
1. A Agent profile can only be created by the authenticated user with matching UID.
2. Products created by agents must be marked as 'pending' initially.
3. Orders must have a deposit amount exactly equal to 50% of the total amount.
4. Users can only read their own orders.
5. All timestamps must be server-generated.

## The Dirty Dozen Payloads (Targeting Rejection)
1. **Identity Spoofing**: Attempt to create an agent profile with a different UID than `request.auth.uid`.
2. **Privilege Escalation**: Attempt to set `role: "admin"` on agent creation.
3. **Ghost Field**: Adding `isVerified: true` to a product update.
4. **ID Poisoning**: Injecting a 2KB string as a `productId`.
5. **State Shortcut**: Updating an order status from `pending` to `completed` without `partially_paid`.
6. **Price Tampering**: Submitting a product with a negative `basePrice`.
7. **PII Leak**: Authenticated user trying to list the `/agents` collection to scrape emails.
8. **Shadow Order**: Creating an order where `depositAmount` != `totalAmount * 0.5`.
9. **Terminal Lock Breach**: Trying to update a `completed` order.
10. **Array Explosion**: Submitting a product with 500 color swatches.
11. **Spoofed Timestamp**: Providing a client-side `createdAt` string instead of `request.time`.
12. **Orphaned Design**: Creating a product with a non-existent `agentId`.

## Audit Results
| Collection | Identity Spoofing | State Shortcut | Resource Poisoning |
|------------|-------------------|----------------|--------------------|
| agents     | Blocked (isOwner) | N/A            | Blocked (size)     |
| products   | Blocked (isValid) | Blocked (Admin)| Blocked (size)     |
| orders     | Blocked (isOwner) | Blocked (Gate) | Blocked (size)     |

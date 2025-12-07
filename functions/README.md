# Firebase Cloud Functions

This directory contains Firebase Cloud Functions for the application.

## Setup

1. Install dependencies:
```bash
cd functions
npm install
```

2. Deploy the functions:
```bash
firebase deploy --only functions
```

## Functions

### changeUserPassword

Allows admins to change a user's password directly.

**Parameters:**
- `userId` (string): The Firebase Auth UID of the user
- `newPassword` (string): The new password (minimum 6 characters)

**Security:**
- Only authenticated users can call this function
- Only users with `isAdmin: true` in their Firestore document can change passwords

**Usage:**
Called from the admin panel when changing a user's password.





'use client';
import type { User } from 'firebase/auth';

/**
 * Defines the context for a Firestore security rule violation.
 * This information is used to construct a detailed error message
 * that helps developers debug their security rules.
 */
export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

/**
 * A custom error class specifically for Firestore permission-denied errors.
 * It encapsulates rich contextual information about the failed request,
 * which is then displayed in the development overlay for easier debugging.
 */
export class FirestorePermissionError extends Error {
  public readonly name: string = 'FirestorePermissionError';
  public readonly context: SecurityRuleContext;
  public readonly user: User | null;

  constructor(context: SecurityRuleContext, user: User | null = null) {
    const message = `Firestore Permission Denied: The following request was denied by Firestore Security Rules:\n${JSON.stringify(
      {
        auth: user ? buildAuthObject(user) : null,
        method: context.operation,
        path: `/databases/(default)/documents/${context.path}`,
        request: context.requestResourceData ? buildRequestObject(context.requestResourceData) : undefined,
      },
      null,
      2
    )}`;

    super(message);
    this.context = context;
    this.user = user;

    // This is necessary for the error to be properly thrown and caught.
    Object.setPrototypeOf(this, FirestorePermissionError.prototype);
  }

  // Method to create a new error instance with the user context
  withUser(user: User | null): FirestorePermissionError {
    return new FirestorePermissionError(this.context, user);
  }
}

/**
 * Constructs a simplified auth object from the Firebase User object.
 * This mimics the `request.auth` object available in Firestore security rules.
 */
function buildAuthObject(user: User) {
  const providerData = user.providerData || [];
  return {
    uid: user.uid,
    token: {
      name: user.displayName,
      picture: user.photoURL,
      email: user.email,
      email_verified: user.emailVerified,
      phone_number: user.phoneNumber,
      firebase: {
        identities: providerData.reduce((acc: Record<string, any[]>, provider) => {
          if (provider.providerId) {
            acc[provider.providerId] = [provider.uid];
          }
          return acc;
        }, {}),
        sign_in_provider: user.isAnonymous ? 'anonymous' : (providerData[0]?.providerId || 'custom'),
      },
    },
  };
}

/**
 * Constructs the `request.resource.data` part of the simulated request context.
 */
function buildRequestObject(data: any) {
    return {
        data: data
    };
}

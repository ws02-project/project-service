declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        subject: string;
        email: string;
        role: string;
      };
      requestId?: string;
      traceId?: string;
    }
  }
}

export {};

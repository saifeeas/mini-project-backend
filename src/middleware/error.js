import { InvalidTokenError, UnauthorizedError, InsufficientScopeError } from "express-oauth2-jwt-bearer";

const errorHandler = (error, request, response, next) => {
  if (error instanceof InsufficientScopeError) {
    const message = "Permission denied";
    response.status(error.status).json({ message });
    return;
  }

  if (error instanceof InvalidTokenError) {
    const message = "Bad credentials";
    response.status(error.status).json({ message });
    return;
  }

  if (error instanceof UnauthorizedError) {
    const message = "Authentication required";
    response.status(error.status).json({ message });
    return;
  }

  const status = error.status || 500;
  const message = error.message || "Internal Server Error";
  response.status(status).json({ message });
};

export default errorHandler

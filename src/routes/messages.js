import { Router } from "express";
import { getAdminMessage, getProtectedMessage, getPublicMessage } from "./messages.service";
import { checkRequiredPermissions, validateAccessToken } from "../middleware/auth0";
import { AdminMessagesPermissions } from "./messages-permissions";

const messagesRouter = Router();

messagesRouter.get("/public", (req, res) => {
  const message = getPublicMessage();

  res.status(200).json(message);
});

messagesRouter.get("/protected", validateAccessToken, (req, res) => {
  const message = getProtectedMessage();

  res.status(200).json(message);
});

messagesRouter.get(
  "/admin",
  validateAccessToken,
  checkRequiredPermissions([AdminMessagesPermissions.Read]),
  (req, res) => {
    const message = getAdminMessage();

    res.status(200).json(message);
  }
);

export default { messagesRouter };

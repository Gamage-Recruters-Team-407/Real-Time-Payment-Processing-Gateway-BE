import * as settingsService from "../services/settingsService.js";

export const getSettings = async (req, res) => {
  try {
    const settings = await settingsService.getSettings(req.user.id);
    res.status(200).json(settings);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    await settingsService.updateSettings(req.user.id, req.body);
    res.status(200).json({ message: "Settings updated successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await settingsService.updatePassword(req.user.id, currentPassword, newPassword);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const sendResetLink = async (req, res) => {
  try {
    const { recoveryEmail } = req.body;
    const result = await settingsService.sendResetLink(recoveryEmail);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

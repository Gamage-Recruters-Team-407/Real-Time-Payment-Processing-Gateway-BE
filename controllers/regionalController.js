import { regionalService } from '../services/regionalService.js';

export const getRegionalVelocity = async (req, res) => {
  try {
    const data = await regionalService.getRegionalVelocity();
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

import { entityLinkService } from '../services/entityLinkService.js';

export const getEntityLinkData = async (req, res) => {
  try {
    const { id } = req.params; // Entity ID to search from
    const graphData = await entityLinkService.getEntityGraph(id);
    res.json(graphData);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

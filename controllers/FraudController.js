import { fraudService } from '../services/fraudService.js';
import FraudLog from '../models/FraudLog.js';

export const getDashboardMetrics = async (req, res) => {
  try {
    const metrics = await fraudService.getDashboardMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const { status, search, page, limit, sortField, sortOrder } = req.query;
    const result = await fraudService.getTransactions({ status, search, page, limit, sortField, sortOrder });
    res.json(result);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

export const getAlerts = async (req, res) => {
  try {
    const alerts = await fraudService.getAlerts();
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
};

export const getAlertById = async (req, res) => {
  try {
    const alert = await fraudService.getAlertById(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json(alert);
  } catch (error) {
    console.error('Error fetching alert details:', error);
    res.status(500).json({ error: 'Failed to fetch alert details' });
  }
};

export const processTransaction = async (req, res) => {
  try {
    const transactionData = req.body;
    // Basic validation
    if (!transactionData.transactionId || !transactionData.userId || !transactionData.amount || !transactionData.merchant) {
      return res.status(400).json({ error: 'Missing required transaction fields' });
    }

    const result = await fraudService.processTransaction(transactionData);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error processing transaction:', error);
    res.status(500).json({ error: 'Failed to process transaction' });
  }
};

// Task 2.1 requested endpoints for action and investigate
export const handleAlertAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, by } = req.body;
    
    const alert = await FraudLog.findById(id);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    alert.actions.push({ action, by: by || 'System' });
    
    // Update status based on action
    if (action === 'BLOCK') alert.status = 'BLOCKED';
    if (action === 'RELEASE' || action === 'CLEAR') alert.status = 'CLEARED';
    
    await alert.save();
    res.json({ message: 'Action recorded', alert });
  } catch (error) {
    console.error('Error handling action:', error);
    res.status(500).json({ error: 'Failed to handle action' });
  }
};

export const investigateAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await FraudLog.findById(id);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    alert.status = 'REVIEW';
    await alert.save();

    // In a real app we'd create an Investigation document here too
    res.json({ message: 'Investigation started', alert });
  } catch (error) {
    console.error('Error investigating alert:', error);
    res.status(500).json({ error: 'Failed to investigate alert' });
  }
};

export const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await FraudLog.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ message: 'Transaction deleted successfully', id });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
};
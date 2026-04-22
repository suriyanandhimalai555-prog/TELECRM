import { Response } from 'express';
import db from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getCampaigns = async (req: AuthRequest, res: Response) => {
  try {
    const campaignsResult = await db.query('SELECT * FROM campaigns ORDER BY created_at DESC');
    res.json(campaignsResult.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createCampaign = async (req: AuthRequest, res: Response) => {
  const { name, type, phone_number } = req.body;
  try {
    const result = await db.query(`
      INSERT INTO campaigns (name, type, phone_number)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [name, type, phone_number]);

    const newCampaignResult = await db.query('SELECT * FROM campaigns WHERE id = $1', [result.rows[0].id]);
    res.status(201).json(newCampaignResult.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateCampaign = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, type, phone_number, status } = req.body;
  try {
    await db.query(`
      UPDATE campaigns 
      SET name = $1, type = $2, phone_number = $3, status = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [name, type, phone_number, status, id]);

    const updatedCampaignResult = await db.query('SELECT * FROM campaigns WHERE id = $1', [id]);
    res.json(updatedCampaignResult.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteCampaign = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM campaigns WHERE id = $1', [id]);
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

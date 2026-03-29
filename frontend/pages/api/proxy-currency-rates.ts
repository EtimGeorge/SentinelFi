import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

/**
 * Proxy route for fetching currency rates without CORS issues.
 * The backend /currency/supported endpoint is now @Public() but runs on a different
 * port/domain during development. This proxy normalizes the call.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    const { data } = await axios.get(`${backendUrl}/currency/supported`, { timeout: 5000 });

    // Cache for 5 minutes — exchange rates don't change frequently
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(data);
  } catch (err) {
    // Return a minimal USD-only response as fallback so pricing page still works
    return res.status(200).json({
      currencies: [
        { code: 'USD', symbol: '$', name: 'US Dollar', rateToUSD: 1 },
        { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', rateToUSD: 1500 }, // Static fallback
        { code: 'GBP', symbol: '£', name: 'British Pound', rateToUSD: 0.79 },
        { code: 'EUR', symbol: '€', name: 'Euro', rateToUSD: 0.92 },
        { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi', rateToUSD: 15.5 },
        { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', rateToUSD: 129 },
        { code: 'ZAR', symbol: 'R', name: 'South African Rand', rateToUSD: 18.4 },
      ],
    });
  }
}

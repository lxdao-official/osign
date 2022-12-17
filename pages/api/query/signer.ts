// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { Prisma } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { recoverPersonalSignature } from 'eth-sig-util';
import { cors, runMiddleware } from '../../../lib/cors';
type Data = {
  name: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Run the middleware
  await runMiddleware(req, res, cors);
  if (req.method == 'GET') {
    if (!req.query.signer) {
      return res.status(400).json({ message: 'Missing launcher' });
    }
    const status = req.query.status;

    const offers = await prisma.offers.findMany({
      where: {
        signers: {
          has: req.query.signer as string,
        },
        ...(status
          ? {
              status: Number(status),
            }
          : {}),
      },
    });
    if (offers) {
      res.status(200).json({
        data: offers,
      });
    } else {
      res.status(404).json({ message: 'offers not found' });
    }
  }
}

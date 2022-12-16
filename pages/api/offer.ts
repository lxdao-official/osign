// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { recoverPersonalSignature } from 'eth-sig-util';
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';

type Data = {
  name: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method == 'POST') {
    const body = req.body;
    if (!body.launcher) {
      return res.status(400).json({ message: 'Missing launcher' });
    }
    if (!body.data) {
      return res.status(400).json({ message: 'Missing data' });
    }
    if (!body.expiresAt) {
      return res.status(400).json({ message: 'Missing expiresAt' });
    }

    if (!body.bussiness) {
      return res.status(400).json({ message: 'Missing bussiness' });
    }
    if (!body.signers || body.signers.length == 0) {
      return res.status(400).json({ message: 'Missing signers' });
    }
    if (!body.signature) {
      return res.status(400).json({ message: 'Missing signature' });
    }

    try {
      const recoveredAddr = recoverPersonalSignature({
        data: `I aggree to create offer detail: ${JSON.stringify(
          body.data,
          null,
          2,
        )} \nWallet address:${body.launcher}.`,
        sig: body.signature,
      });
      if (
        !recoveredAddr ||
        recoveredAddr.toLowerCase() != body.launcher.toLowerCase()
      ) {
        return res.status(400).json({ message: 'invalid signature' });
      }
      const offer = await prisma.offers.create({
        data: {
          launcher: body.launcher,
          staticData: body.data,
          expiresAt: new Date(body.expiresAt),
          signers: body.signers,
          bussiness: body.bussiness,
        },
      });
      res.status(200).json({
        data: offer,
      });
    } catch (e: any) {
      return res
        .status(400)
        .json({ message: 'create offer error: ' + e.message });
    }
  }
}

// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { recoverTypedSignature_v4 } from 'eth-sig-util';
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';

type Data = {
  name: string;
};
import { runMiddleware, cors } from './../../lib/cors';
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Run the middleware
  await runMiddleware(req, res, cors);

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
    if (!body.domain) {
      return res.status(400).json({ message: 'Missing domain' });
    }
    if (!body.types) {
      return res.status(400).json({ message: 'Missing types' });
    }
    if (!body.primaryType) {
      return res.status(400).json({ message: 'Missing primaryType' });
    }

    try {
      let messageParams: any = {};
      const data = {
        domain: body.domain,
        types: body.types,
        message: body.data,
        primaryType: body.primaryType,
      };
      messageParams.sig = body.signature;
      messageParams.data = data;
      console.log('messageParams', JSON.stringify(messageParams, null, 2));
      const recoveredAddr = recoverTypedSignature_v4(messageParams);
      console.log('recoveredAddr', recoveredAddr);
      // console.log(recoverTypedSignature(messageParams));
      // const recoveredAddr = recoverPersonalSignature({
      //   data: `I aggree to create offer detail: ${JSON.stringify(
      //     body.data,
      //     null,
      //     2,
      //   )} \nWallet address:${body.launcher}.`,
      //   sig: body.signature,
      // });
      if (
        !recoveredAddr ||
        recoveredAddr.toLowerCase() != body.launcher.toLowerCase()
      ) {
        return res
          .status(400)
          .json({ message: 'invalid signature, not launcher' });
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
      console.error(e);
      return res
        .status(400)
        .json({ message: 'create offer error: ' + e.message });
    }
  }
}

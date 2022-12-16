// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { Prisma } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { recoverPersonalSignature } from 'eth-sig-util';
type Data = {
  name: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method == 'GET') {
    const offer = await prisma.offers.findMany({
      where: {
        id: req.query.id as string,
      },
    });
    if (offer) {
      res.status(200).json({
        data: offer,
      });
    } else {
      res.status(404).json({ message: 'offer not found' });
    }
  } else if (req.method == 'PUT') {
    // 更新签名
    const signer = req.body.signer;
    const signature = req.body.signature;
    const id = req.query.id as string;
    const data = req.body.data;

    if (!signer) {
      return res.status(400).json({ message: 'Missing signer' });
    }
    if (!signature) {
      return res.status(400).json({ message: 'Missing signature' });
    }
    const offer = await prisma.offers.findFirst({
      where: {
        id: id,
      },
    });
    console.log(offer);
    if (!offer) {
      return res.status(404).json({ message: 'offer not found' });
    }
    if (!offer.signers.includes(signer)) {
      return res.status(400).json({ message: 'not valid signer' });
    }
    if (offer.expiresAt < new Date()) {
      return res.status(400).json({ message: 'offer expired' });
    }

    //@ts-ignore
    if (offer.signdata && offer.signdata[signer]) {
      return res.status(400).json({ message: 'already signed' });
    }

    try {
      const recoveredAddr = recoverPersonalSignature({
        data: `I am sign for the offer: ${id} \nOffer detail: ${JSON.stringify(
          offer.staticData,
          null,
          2,
        )} \nWallet address:${signer}.`,
        sig: signature,
      });
      console.log(
        `I am sign for the offer: ${id} \nOffer detail: ${JSON.stringify(
          offer.staticData,
          null,
          2,
        )} \nWallet address:${signer}.`,
      );
      console.log(recoveredAddr, signer, signature);
      if (
        !recoveredAddr ||
        recoveredAddr.toLowerCase() != signer.toLowerCase()
      ) {
        return res.status(400).json({ message: 'invalid signature' });
      }
      let signdata = offer.signdata as Prisma.JsonObject;
      if (!signdata) {
        signdata = {};
      }
      signdata = {
        ...signdata,
        [signer]: signature,
      };

      // 写入扩展数据
      let extData = offer.extData as Prisma.JsonObject;
      if (!extData) {
        extData = {};
      } else {
        for (let key in data) {
          // 不能覆盖已有字段，只能增量写入新的字段
          if (extData[key] == undefined) {
            extData[key] = data[key];
          }
        }
      }

      // 检查是否签名完毕
      let allSigned = false;
      if (offer.signers.length == Object.keys(signdata).length) {
        allSigned = true;
      }

      const offers = await prisma.offers.update({
        where: {
          id: id,
        },
        data: {
          extData: extData,
          signdata,
          ...(allSigned ? { status: 2 } : {}),
        },
      });

      res.status(200).json({
        data: offers,
      });
    } catch (e: any) {
      console.log(e);
      res.status(400).json({ message: 'update offer error: ' + e.message });
    }
  }
}

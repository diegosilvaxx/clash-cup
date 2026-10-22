import {
  collection,
  doc,
  getAuth,
  getDocs,
  getFirebaseApp,
  getFirestore,
  query,
  where,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from '@clash-cup/firebase';
import type { PlayerProfile } from '@clash-cup/session';
import { findEmblem } from './catalog';
import { parseRankings, parseWallet, RewardError, type RankingData, type Wallet } from './model';
export * from './catalog';
export * from './model';

export function createRewardRepository(
  database: () => Firestore = () => getFirestore(getFirebaseApp()),
) {
  function assertUser(profile: PlayerProfile) {
    if (getAuth(getFirebaseApp()).currentUser?.uid !== profile.uid)
      throw new RewardError('Sua sessão mudou. Entre novamente para continuar.');
  }
  return {
    async wallet(profile: PlayerProfile): Promise<Wallet | null> {
      assertUser(profile);
      const result = await getDocs(
        query(collection(database(), 'shop'), where('idClashRoyale', '==', profile.idClashRoyale)),
      );
      assertUser(profile);
      if (result.docs.length > 1)
        throw new RewardError('Há mais de um saldo para esta tag. Peça à organização uma revisão.');
      const item = result.docs[0];
      return item ? parseWallet(item.id, item.data()) : null;
    },
    async change(
      profile: PlayerProfile,
      walletId: string,
      emblemId: string,
      action: 'buy' | 'equip',
    ): Promise<Wallet> {
      assertUser(profile);
      const item = findEmblem(emblemId);
      if (!item) throw new RewardError('Este emblema não está disponível.');
      const db = database();
      const reference = doc(db, 'shop', walletId);
      return runTransaction(db, async (transaction) => {
        assertUser(profile);
        const snapshot = await transaction.get(reference);
        assertUser(profile);
        if (!snapshot.exists())
          throw new RewardError('Seu saldo ainda não foi habilitado pela organização.');
        const wallet = parseWallet(snapshot.id, snapshot.data());
        if (wallet.ownerUid !== profile.uid || wallet.idClashRoyale !== profile.idClashRoyale)
          throw new RewardError('O saldo precisa ser associado à sua conta pela organização.');
        const owned = wallet.emotesBuy.includes(item.id);
        if (action === 'equip' && !owned)
          throw new RewardError('Você ainda não possui este emblema.');
        if (action === 'buy' && !owned && item.event)
          throw new RewardError('Este emblema é exclusivo de eventos.');
        const price = action === 'buy' && !owned ? item.price : 0;
        if (wallet.gold < price)
          throw new RewardError('Saldo insuficiente para comprar este emblema.');
        if (!owned && wallet.emotesBuy.length >= 100)
          throw new RewardError('Sua coleção precisa de revisão pela organização.');
        const updated = {
          ...wallet,
          gold: wallet.gold - price,
          emotesBuy: owned ? wallet.emotesBuy : [...wallet.emotesBuy, item.id],
          use: item.id,
        };
        if (owned && wallet.use === item.id) return wallet;
        transaction.update(reference, {
          gold: updated.gold,
          emotesBuy: updated.emotesBuy,
          use: updated.use,
          lastUpdated: serverTimestamp(),
        });
        return updated;
      });
    },
    async ranking(): Promise<RankingData> {
      const db = database();
      const [current, history, badges] = await Promise.allSettled([
        getDocs(collection(db, 'ranking')),
        getDocs(collection(db, 'rankingHistory')),
        getDocs(collection(db, 'shop')),
      ]);
      if (current.status === 'rejected') throw current.reason;
      if (history.status === 'rejected') throw history.reason;
      const parsed = parseRankings(
        current.value.docs.map((item) => ({ id: item.id, data: item.data() })),
        history.value.docs.map((item) => ({ id: item.id, data: item.data() })),
      );
      const equipped: Record<string, string> = {};
      const seen = new Set<string>();
      if (badges.status === 'fulfilled')
        for (const document of badges.value.docs) {
          try {
            const wallet = parseWallet(document.id, document.data());
            if (seen.has(wallet.idClashRoyale)) {
              delete equipped[wallet.idClashRoyale];
              continue;
            }
            seen.add(wallet.idClashRoyale);
            if (
              findEmblem(wallet.use) &&
              (wallet.emotesBuy.includes(wallet.use) || wallet.use === 'juggling')
            )
              equipped[wallet.idClashRoyale] = wallet.use;
          } catch {
            /* Keep standings available when a legacy wallet needs review. */
          }
        }
      return { ...parsed, badges: equipped, badgesUnavailable: badges.status === 'rejected' };
    },
  };
}
export const rewards = createRewardRepository();

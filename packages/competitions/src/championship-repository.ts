import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  getFirebaseApp,
  getAuth,
  query,
  where,
  runTransaction,
  serverTimestamp,
} from '@clash-cup/firebase';
import {
  championshipSchema,
  type Championship,
  type ChampionshipInput,
} from './championship-model';
import { CompetitionError } from './model';

const collectionName = 'communityChampionships';
function parse(id: string, raw: Record<string, unknown>): Championship {
  const { ownerUid, revision } = raw;
  const input = Object.fromEntries(
    Object.entries(raw).filter(([key]) => !['ownerUid', 'revision', 'updatedAt'].includes(key)),
  );
  if (typeof ownerUid !== 'string' || !Number.isInteger(revision))
    throw new CompetitionError('Este campeonato contém dados inválidos.');
  return { ...championshipSchema.parse(input), id, ownerUid, revision: revision as number };
}
function assertUser(uid: string) {
  if (getAuth(getFirebaseApp()).currentUser?.uid !== uid)
    throw new CompetitionError('Sua sessão mudou. Entre novamente.');
}
export const championships = {
  async list(uid: string): Promise<Championship[]> {
    assertUser(uid);
    const result = await getDocs(
      query(
        collection(getFirestore(getFirebaseApp()), collectionName),
        where('ownerUid', '==', uid),
      ),
    );
    assertUser(uid);
    return result.docs
      .map((item) => parse(item.id, item.data()))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  },
  async get(id: string): Promise<Championship | null> {
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) return null;
    const result = await getDoc(doc(getFirestore(getFirebaseApp()), collectionName, id));
    return result.exists() ? parse(result.id, result.data()) : null;
  },
  async save(
    uid: string,
    input: ChampionshipInput,
    previous: Championship | null,
  ): Promise<Championship> {
    assertUser(uid);
    const data = championshipSchema.parse(input);
    const db = getFirestore(getFirebaseApp());
    const reference = previous
      ? doc(db, collectionName, previous.id)
      : doc(collection(db, collectionName));
    const revision = (previous?.revision ?? 0) + 1;
    await runTransaction(db, async (transaction) => {
      const current = await transaction.get(reference);
      assertUser(uid);
      if (
        previous
          ? !current.exists() ||
            current.data().ownerUid !== uid ||
            current.data().revision !== previous.revision
          : current.exists()
      )
        throw new CompetitionError(
          'O campeonato foi alterado em outra aba. Atualize a página antes de continuar.',
        );
      if (current.exists() && current.data().status === 'published') {
        if (
          Object.entries(data).some(
            ([key, value]) =>
              key !== 'scores' && JSON.stringify(value) !== JSON.stringify(current.data()[key]),
          )
        )
          throw new CompetitionError('Após publicar, só os placares podem ser alterados.');
      }
      transaction.set(reference, {
        ...data,
        ownerUid: uid,
        revision,
        updatedAt: serverTimestamp(),
      });
    });
    assertUser(uid);
    return { ...data, id: reference.id, ownerUid: uid, revision };
  },
};

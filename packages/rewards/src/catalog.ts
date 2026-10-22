import source from './catalog.json';

const images = import.meta.glob<string>('./assets/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
});
export const emblems = source.map((item) => ({
  ...item,
  event: item.event === true,
  image: images[`./assets/${item.image}`]!,
}));
export type Emblem = (typeof emblems)[number];
export function findEmblem(id: string) {
  return emblems.find((item) => item.id === id);
}

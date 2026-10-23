import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { ActionLink, artwork, Container, surface } from '@clash-cup/ui';

export const HomePage = styled(Container)`
  padding-top: 22px;
`;
export const Hero = styled.section`
  position: relative;
  isolation: isolate;
  min-height: 410px;
  padding: 55px 32px;
  border-radius: 16px;
  overflow: hidden;
  background: #102849;
  border: 1px solid #213e62;
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -3;
    background: url(${artwork.landscape}) center/cover;
    opacity: 0.65;
  }
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -2;
    background:
      linear-gradient(90deg, #091b36 3%, #0b2146ee 35%, #0a1b3a22 82%),
      linear-gradient(0deg, #0b1c36, transparent 50%);
  }
  .hero-copy {
    max-width: 68%;
    position: relative;
    z-index: 2;
  }
  h1 {
    font-family: Impact, 'Arial Narrow', sans-serif;
    font-size: clamp(2.7rem, 4.25vw, 4.7rem);
    font-weight: 900;
    letter-spacing: -0.015em;
    line-height: 1.05;
    margin: 17px 0 18px;
    text-transform: uppercase;
    text-shadow: 0 3px 3px #0008;
  }
  h1 span {
    display: block;
    color: #ffda74;
  }
  p {
    max-width: 530px;
    font-size: 0.98rem;
    color: #e0eaff;
  }
  .eyebrow {
    display: flex;
    align-items: center;
    gap: 9px;
    color: var(--cup-gold);
    font-size: 0.65rem;
    font-weight: 850;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }
  .prince {
    position: absolute;
    height: 105%;
    width: auto;
    max-width: none;
    bottom: -8%;
    right: 12%;
    z-index: -1;
    filter: drop-shadow(0 10px 25px #0007);
  }
  .archer {
    position: absolute;
    height: 85%;
    width: auto;
    max-width: none;
    bottom: -5%;
    right: -13%;
    z-index: -1;
    filter: drop-shadow(0 0 18px #13ccff44);
  }
  @media (max-width: 1150px) {
    h1 {
      font-size: 3.1rem;
    }
    .hero-copy {
      max-width: 75%;
    }
    .prince {
      right: 2%;
      opacity: 0.8;
    }
    .archer {
      right: -22%;
    }
  }
  @media (max-width: 600px) {
    padding: 28px 22px 240px;
    min-height: 575px;
    .hero-copy {
      max-width: 100%;
    }
    h1 {
      font-size: clamp(2.1rem, 9vw, 3rem);
    }
    .eyebrow {
      font-size: 0.57rem;
      letter-spacing: 0.08em;
    }
    p {
      font-size: 0.9rem;
    }
    .prince {
      height: 280px;
      right: 22%;
      bottom: -14px;
      opacity: 1;
    }
    .archer {
      height: 250px;
      right: -18%;
      bottom: -6px;
    }
    &::after {
      background: linear-gradient(#0b1f40fa 20%, #0b2146cc 54%, #0a1b3a00);
    }
  }
`;
export const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 28px;
`;
export const SecondaryAction = styled(ActionLink)`
  background: #0a1c35bc;
  border-color: #6088b2;
  box-shadow: none;
`;
export const Pillars = styled.div`
  ${surface} display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 16px 12px;
  margin: 18px 0 22px;
  > div {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 4px 20px;
    border-right: 1px solid var(--cup-border);
  }
  > div:last-child {
    border-right: 0;
  }
  img {
    width: 46px;
    height: 46px;
    object-fit: contain;
  }
  strong {
    display: block;
    color: var(--cup-gold);
    font-size: 0.65rem;
    letter-spacing: 0.14em;
    margin-bottom: 7px;
  }
  span {
    font-size: 0.85rem;
    font-weight: 650;
  }
  @media (max-width: 1150px) {
    > div {
      padding: 4px 12px;
      gap: 10px;
    }
    span {
      font-size: 0.75rem;
    }
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    padding: 10px 16px;
    > div {
      padding: 14px 0;
      border-right: 0;
      border-bottom: 1px solid var(--cup-border);
    }
    > div:last-child {
      border-bottom: 0;
    }
    span {
      font-size: 0.9rem;
    }
  }
`;
export const Dashboard = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.9fr) minmax(270px, 1fr);
  gap: 20px;
  align-items: start;
  @media (max-width: 1150px) {
    grid-template-columns: 1fr;
  }
`;
export const Section = styled.section`
  min-width: 0;
  .section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 16px;
  }
  h2 {
    margin: 0;
    font-size: 1.35rem;
  }
  .section-heading a {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: #67c6ff;
    font-size: 0.8rem;
    text-decoration: none;
    min-height: 32px;
  }
`;
export const TournamentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  > :only-child {
    grid-column: 1 / -1;
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;
export const RankingPanel = styled(Section)`
  ${surface} padding: 20px;
  h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.1rem;
  }
  h2 svg {
    color: var(--cup-gold);
  }
  ol {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 15px 0;
    border-bottom: 1px solid var(--cup-border);
    font-size: 0.85rem;
  }
  li:last-child {
    border: 0;
  }
  .position {
    display: grid;
    place-items: center;
    width: 28px;
    height: 34px;
    border-radius: 8px;
    background: #80601944;
    color: var(--cup-gold);
    border: 1px solid #a57b32;
    font-weight: 850;
  }
  li:nth-child(2) .position {
    color: #d5e2f2;
    border-color: #7189a9;
    background: #2b3d57;
  }
  li:nth-child(3) .position {
    color: #f0b488;
    border-color: #9e6f4c;
    background: #68442644;
  }
  .name {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
    font-weight: 650;
  }
  .points {
    color: var(--cup-muted);
    white-space: nowrap;
    font-size: 0.75rem;
  }
  .emblem {
    width: 30px;
    height: 30px;
    object-fit: contain;
  }
  .all-ranking {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #70c7ff;
    font-size: 0.85rem;
    min-height: 44px;
    margin-top: 8px;
    text-decoration: none;
  }
`;
export const ChestShortcut = styled(Link)`
  ${surface} display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 18px;
  padding: 22px 18px;
  text-decoration: none;
  img {
    width: 85px;
    filter: drop-shadow(0 0 14px #ffba3933);
  }
  strong {
    display: block;
    font-size: 1.1rem;
    margin-bottom: 7px;
  }
  p {
    font-size: 0.8rem;
    margin-bottom: 8px;
  }
  span {
    font-size: 0.78rem;
    color: #6ecbff;
  }
`;
export const EmptyPanel = styled.div`
  ${surface} padding: 28px;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 12px;
  > svg {
    color: var(--cup-gold);
  }
  p {
    margin: 0;
    font-size: 0.9rem;
  }
  button {
    background: transparent;
    border: 1px solid #4d7ca7;
    color: #9fd5ff;
    border-radius: 8px;
    padding: 10px 15px;
    min-height: 44px;
  }
`;
export const Community = styled.section`
  ${surface} display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 24px;
  margin-top: 26px;
  h2 {
    font-size: 1.3rem;
    margin: 0 0 8px;
  }
  p {
    margin: 0;
    font-size: 0.85rem;
  }
  a {
    flex-shrink: 0;
  }
  @media (max-width: 600px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

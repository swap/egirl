export type Links = {
  projects?: string;
  github?: string;
  telegram?: string;
  discord?: string;
  email?: string;
};

export type Game = {
  name: string;
  cover: string;
  tags: string[];
};

export type Section = {
  id: string;
  label: string;
  description: string;
  games?: Game[];
};

export type Me = {
  name?: string;
  greeting?: string;
  description?: string;
  email?: string;
  links?: Links;
  sections?: Section[];
  commissions?: { enabled?: boolean };
};

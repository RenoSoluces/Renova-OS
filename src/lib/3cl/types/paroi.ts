export interface CoucheParoi {

  id: string;

  nom: string;

  lambda: number;

  epaisseur: number; // mètres

  densite: number;

  chaleurSpecifique: number;

}

export interface Paroi3CL {

  nom: string;

  couches: CoucheParoi[];

}
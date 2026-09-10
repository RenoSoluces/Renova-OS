export interface PostePerte {

  nom: string;

  valeur: number;

  pourcentage: number;

}

export function calculPertes(

  pertes: {

    murs: number;

    menuiseries: number;

    planchers: number;

    toitures: number;

    pontsThermiques: number;

    ventilation: number;

    total: number;

  }

): PostePerte[] {

  const total =
    pertes.total || 1;

  return [

    {

      nom: "Toitures",

      valeur:
        pertes.toitures,

      pourcentage:
        pertes.toitures /
        total *
        100,

    },

    {

      nom: "Murs",

      valeur:
        pertes.murs,

      pourcentage:
        pertes.murs /
        total *
        100,

    },

    {

      nom: "Fenêtres",

      valeur:
        pertes.menuiseries,

      pourcentage:
        pertes.menuiseries /
        total *
        100,

    },

    {

      nom: "Planchers",

      valeur:
        pertes.planchers,

      pourcentage:
        pertes.planchers /
        total *
        100,

    },

    {

      nom: "Ponts thermiques",

      valeur:
        pertes.pontsThermiques,

      pourcentage:
        pertes.pontsThermiques /
        total *
        100,

    },

    {

      nom: "Ventilation",

      valeur:
        pertes.ventilation,

      pourcentage:
        pertes.ventilation /
        total *
        100,

    }

  ].sort(

    (a, b) =>
      b.valeur - a.valeur

  );

}
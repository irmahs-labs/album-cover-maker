import type { FilterId } from "../lib/filters";
import type { Corner } from "../lib/state";
import type { Kind } from "./cover-canvas";

type SpotRow = "top" | "middle" | "bottom";

type SpotColumn = "left" | "center" | "right";

// Where the text sits, as French says it: "en haut à gauche"
const FRENCH_ROWS = {
  bottom: "en bas",
  middle: "au milieu",
  top: "en haut",
} satisfies Record<SpotRow, string>;

const FRENCH_COLUMNS = {
  center: "au centre",
  left: "à gauche",
  right: "à droite",
} satisfies Record<SpotColumn, string>;

/** Everything the maker says, in English and in French. */
export const MAKER_COPY = {
  en: {
    alignLabel: "Text alignment",
    alignName: (align: string) => `Align ${align}`,
    alignment: "Alignment",
    aligns: { center: "center", left: "left", right: "right" },
    buttonsAndText: "Buttons and text",
    by: "by Irma HS",
    chooseOne: "or click to choose one",
    choosePhoto: "choose photo",
    combosLead: (picked: boolean, count: number) =>
      `${picked ? "Picked from your photo." : "Add a photo and these pick up its colours."} Each of the ${count} sets the cover fonts and player colours.`,
    corners: {
      "bottom-left": "bottom left",
      "bottom-right": "bottom right",
      "top-left": "top left",
      "top-right": "top right",
    } satisfies Record<Corner, string>,
    coverPreview: (title: string, subtitle: string) =>
      `Album cover preview: ${title} by ${subtitle}`,
    cropped: (w: number, h: number) => `${w} × ${h}, cropped to square`,
    dismiss: "dismiss",
    dragHint:
      "Drag the title to place it, or anywhere else to move your photo (arrow keys work too).",
    dropHere: "Drop a photo here",
    exports: {
      cover: "Cover",
      player: "Player",
      record: "Record",
    } satisfies Record<Kind, string>,
    filter: "Filter",
    filterStrength: "Filter strength",
    filters: {
      cool: "Cool",
      fade: "Fade",
      mono: "Mono",
      original: "Original",
      vivid: "Vivid",
      warm: "Warm",
    } satisfies Record<FilterId, string>,
    fontStyle: (label: string) => `${label} font style`,
    fontsHint:
      "Title and subtitle fonts are separate sets, so the two never clash.",
    hint: "drop in a photo, add your title, export your cover.",
    history: "History",
    horizontal: "Horizontal position",
    huesLocked:
      "Locked, both sliders move together and keep the same contrast.",
    huesUnlocked: "Unlocked, each slider moves on its own.",
    labelCorner: "Label corner",
    labelHint: (corner: string, spot: string) =>
      `The label has the ${corner} corner, so the text sits in the ${spot}.`,
    labelSize: "Label size",
    labelWidth: (percent: number) => `${percent}% of the width`,
    lato: "The player's text always uses Lato.",
    legends: {
      combos: "combos",
      coverText: "cover text",
      export: "export",
      fonts: "fonts",
      label: "label",
      photo: "photo",
      player: "player",
    },
    locked: "locked",
    lucky: "I'm feeling lucky",
    mainTitle: "Main title",
    more: "more apps at",
    mostReleases: "Most releases use S (10%).",
    moveTogether: "Move both sliders together",
    noPhoto: "No photo yet. JPEG, PNG and WebP all work.",
    notImage: "That isn't an image. Try a JPEG, PNG or WebP.",
    photoFilter: "Photo filter",
    player: "Player",
    playerPreview: "Music player preview using your cover",
    position: "Position",
    positions: {
      bottom: "bottom",
      center: "center",
      left: "left",
      middle: "middle",
      right: "right",
      top: "top",
    },
    preview: "Preview",
    recordHint:
      "The backdrop is your photo's main colour, and the record's label shows the picture.",
    recordPreview: "Record mock-up: your cover with the record peeking out",
    redo: "redo",
    redoTitle: "Redo (Ctrl+Shift+Z or ⇧⌘Z)",
    replacePhoto: "replace photo",
    saving: "Saving…",
    settings: "Settings",
    showLabel: "Show the label",
    showText: "Show text on the cover",
    smallPhoto:
      "This photo is under 3000 px, so the export will be scaled up and may look soft.",
    spot: (row: SpotRow, column: SpotColumn) => `${row} ${column}`,
    startOver: "start over",
    startOverConfirm: "Start over? Your photo and settings will be cleared.",
    staysHere: "Your photo stays in your browser. Nothing is uploaded.",
    streaming: "Streaming stores ask for at least 3000 × 3000.",
    styles: {
      bold: "bold",
      italic: "italic",
      strike: "strikethrough",
      underline: "underline",
    },
    subtitle: "Subtitle",
    subtitleColour: "Subtitle colour",
    subtitleFont: "Subtitle font",
    suggested: "Suggested combos",
    title: "Title",
    titleColour: "Title colour",
    titleFont: "Title font",
    undo: "undo",
    undoTitle: "Undo (Ctrl+Z or ⌘Z)",
    unlocked: "unlocked",
    vertical: "Vertical position",
    with: (font: string) => `with ${font}`,
    zoom: "Zoom",
  },
  fr: {
    alignLabel: "Alignement du texte",
    alignName: (align: string) => `Aligner à ${align}`,
    alignment: "Alignement",
    aligns: { center: "centre", left: "gauche", right: "droite" },
    buttonsAndText: "Boutons et texte",
    by: "par Irma HS",
    chooseOne: "ou cliquez pour en choisir une",
    choosePhoto: "choisir une photo",
    combosLead: (picked: boolean, count: number) =>
      `${picked ? "Choisis d’après votre photo." : "Ajoutez une photo et ils reprennent ses couleurs."} Chacun des ${count} règle les polices de la pochette et les couleurs du lecteur.`,
    corners: {
      "bottom-left": "en bas à gauche",
      "bottom-right": "en bas à droite",
      "top-left": "en haut à gauche",
      "top-right": "en haut à droite",
    } satisfies Record<Corner, string>,
    coverPreview: (title: string, subtitle: string) =>
      `Aperçu de la pochette : ${title} par ${subtitle}`,
    cropped: (w: number, h: number) => `${w} × ${h}, recadrée en carré`,
    dismiss: "fermer",
    dragHint:
      "Faites glisser le titre pour le placer, ou ailleurs pour déplacer la photo (les flèches marchent aussi).",
    dropHere: "Déposez une photo ici",
    exports: {
      cover: "Pochette",
      player: "Lecteur",
      record: "Vinyle",
    } satisfies Record<Kind, string>,
    filter: "Filtre",
    filterStrength: "Intensité du filtre",
    filters: {
      cool: "Froid",
      fade: "Délavé",
      mono: "Mono",
      original: "Original",
      vivid: "Éclatant",
      warm: "Chaud",
    } satisfies Record<FilterId, string>,
    fontStyle: (label: string) => `Style de police : ${label.toLowerCase()}`,
    fontsHint:
      "Les polices du titre et du sous-titre sont des jeux séparés, pour qu’elles ne jurent jamais.",
    hint: "déposez une photo, ajoutez un titre, exportez la pochette.",
    history: "Historique",
    horizontal: "Position horizontale",
    huesLocked:
      "Verrouillés, les deux curseurs bougent ensemble et gardent le même contraste.",
    huesUnlocked: "Déverrouillés, chaque curseur bouge seul.",
    labelCorner: "Coin du logo",
    labelHint: (corner: string, spot: string) =>
      `Le logo occupe le coin ${corner}, le texte se place donc ${spot}.`,
    labelSize: "Taille du logo",
    labelWidth: (percent: number) => `${percent} % de la largeur`,
    lato: "Le texte du lecteur est toujours en Lato.",
    legends: {
      combos: "combos",
      coverText: "texte",
      export: "export",
      fonts: "polices",
      label: "logo",
      photo: "photo",
      player: "lecteur",
    },
    locked: "verrouillé",
    lucky: "J’ai de la chance",
    mainTitle: "Titre principal",
    more: "plus d’apps sur",
    mostReleases: "La plupart des sorties utilisent S (10 %).",
    moveTogether: "Bouger les deux curseurs ensemble",
    noPhoto: "Pas encore de photo. JPEG, PNG et WebP fonctionnent.",
    notImage: "Ce n’est pas une image. Essayez un JPEG, PNG ou WebP.",
    photoFilter: "Filtre de la photo",
    player: "Lecteur",
    playerPreview: "Aperçu du lecteur de musique avec votre pochette",
    position: "Position",
    positions: {
      bottom: "bas",
      center: "centre",
      left: "gauche",
      middle: "milieu",
      right: "droite",
      top: "haut",
    },
    preview: "Aperçu",
    recordHint:
      "Le fond reprend la couleur principale de votre photo, et l’étiquette du vinyle montre l’image.",
    recordPreview: "Maquette du vinyle : votre pochette, le disque qui dépasse",
    redo: "rétablir",
    redoTitle: "Rétablir (Ctrl+Maj+Z ou ⇧⌘Z)",
    replacePhoto: "remplacer la photo",
    saving: "Enregistrement…",
    settings: "Réglages",
    showLabel: "Afficher le logo",
    showText: "Afficher le texte sur la pochette",
    smallPhoto:
      "Cette photo fait moins de 3000 px : l’export sera agrandi et peut paraître flou.",
    spot: (row: SpotRow, column: SpotColumn) =>
      row === "middle" && column === "center"
        ? "au centre"
        : `${FRENCH_ROWS[row]} ${FRENCH_COLUMNS[column]}`,
    startOver: "recommencer",
    startOverConfirm:
      "Recommencer ? Votre photo et vos réglages seront effacés.",
    staysHere: "Votre photo reste dans votre navigateur. Rien n’est envoyé.",
    streaming: "Les plateformes de streaming demandent au moins 3000 × 3000.",
    styles: {
      bold: "gras",
      italic: "italique",
      strike: "barré",
      underline: "souligné",
    },
    subtitle: "Sous-titre",
    subtitleColour: "Couleur du sous-titre",
    subtitleFont: "Police du sous-titre",
    suggested: "Combos suggérés",
    title: "Titre",
    titleColour: "Couleur du titre",
    titleFont: "Police du titre",
    undo: "annuler",
    undoTitle: "Annuler (Ctrl+Z ou ⌘Z)",
    unlocked: "déverrouillé",
    vertical: "Position verticale",
    with: (font: string) => `avec ${font}`,
    zoom: "Zoom",
  },
};

export type MakerCopy = (typeof MAKER_COPY)["en"];

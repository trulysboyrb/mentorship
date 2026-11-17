// Detects the classic code: Up Up Down Down Left Right Left Right B A.
const SEQ = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];

export function createKonami(onMatch: () => void): (key: string) => boolean {
  let i = 0;
  return (key: string) => {
    const k = key.toLowerCase();
    if (k === SEQ[i]) {
      i++;
      if (i === SEQ.length) {
        i = 0;
        onMatch();
        return true;
      }
    } else {
      i = k === SEQ[0] ? 1 : 0;
    }
    return false;
  };
}

import { LABEL_DIMENSIONS, PAPER_DIMENSIONS, fitGrid } from './qr-label-layout';

describe('qr-label-layout', () => {
  describe('fitGrid', () => {
    it('fills an A4 sheet with medium labels', () => {
      // 190mm usable width / 70mm labels => 2 across;
      // 277mm usable height / 30mm labels => 8 down.
      expect(fitGrid(PAPER_DIMENSIONS.A4, LABEL_DIMENSIONS.medium)).toEqual({
        columns: 2,
        rows: 8,
      });
    });

    it('fits fewer large labels than small ones on the same sheet', () => {
      const small = fitGrid(PAPER_DIMENSIONS.A4, LABEL_DIMENSIONS.small);
      const large = fitGrid(PAPER_DIMENSIONS.A4, LABEL_DIMENSIONS.large);

      expect(small).toEqual({ columns: 3, rows: 10 });
      expect(large).toEqual({ columns: 2, rows: 7 });
    });

    it('accounts for the smaller A5 sheet', () => {
      expect(fitGrid(PAPER_DIMENSIONS.A5, LABEL_DIMENSIONS.large)).toEqual({
        columns: 1,
        rows: 5,
      });
    });

    it('accounts for the wider Letter sheet', () => {
      expect(fitGrid(PAPER_DIMENSIONS.Letter, LABEL_DIMENSIONS.medium)).toEqual(
        {
          columns: 2,
          rows: 7,
        }
      );
    });

    it('never returns a grid with no cells', () => {
      // A label wider and taller than any sheet still has to render one per page
      // rather than a page that can hold nothing.
      expect(
        fitGrid({ width: 40, height: 40 }, { width: 500, height: 500 })
      ).toEqual({ columns: 1, rows: 1 });
    });
  });
});

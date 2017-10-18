var utils = require('../utils');

describe('Utils', function() {
    describe('paging function', function() {
        var pagedData = utils.paginate(['a', 'b', 'c', 'd'], 1, 2);
        it('should return an array of the specified size', function() {
            expect(pagedData.files).toEqual(['a', 'b']);
        });

        it('should have a next page', function() {
            expect(pagedData.hasNext).toBe(true);
        });

        it('should not have a last page', function() {
            expect(pagedData.hasLast).toBe(false);
        });
    });
});

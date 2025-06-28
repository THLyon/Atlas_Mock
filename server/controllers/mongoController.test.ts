import { Request, Response, NextFunction } from 'express';
import { queryByTitle } from './mongoController';
// import { movies } from '../models/mongoModel';

jest.mock('../models/mongoModel');

xdescribe('mongoController - queryByTitle', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = { locals: {} };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return an error if res.locals.structuredQuery is not defined', async () => {
    await queryByTitle(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        log: 'mongoController.queryByTitle did not receive structuredQuery',
        status: 500,
        message: { err: 'An error occurred before querying the database' },
      })
    );
  });

  it('should proceed to next middleware if titleToFind is not provided', async () => {
    res.locals!.structuredQuery = {};
    await queryByTitle(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('should handle errors thrown during database query', async () => {
    res.locals!.structuredQuery = { titleToFind: 'Sample Movie' };
    const mockError = new Error('Database query failed');
    // (movies.findOne as jest.Mock).mockRejectedValue(mockError);

    await queryByTitle(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith({
      log: `queryMongoDatabase: ${mockError}`,
      status: 500,
      message: { err: 'An error occurred while querying Mongo database' },
    });
  });
});

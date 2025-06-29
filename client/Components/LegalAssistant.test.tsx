/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Recommendations from './LegalAssistant';
import 'whatwg-fetch';
import nock from 'nock';

describe('Recommendations Component', () => {
  beforeAll(() => {
    nock(window.location.origin)
      .persist()
      .post(
        '/api',
        JSON.stringify({
          userQuery:
            'A genie who grants wishes, but the third frees him to unleash chaos until a woman traps him.',
        }),
        {
          reqheaders: {
            'Content-Type': 'application/json',
          },
        }
      )
      .reply(200, {
        movieRecommendation:
          'Wishmaster - A malevolent genie wreaks havoc after being freed, leading to a battle between his dark desires and those trying to stop him.',
      });
    nock(window.location.origin)
      .persist()
      .post(
        '/api',
        JSON.stringify({
          userQuery: 'This API call fails',
        }),
        {
          reqheaders: {
            'Content-Type': 'application/json',
          },
        }
      )
      .reply(500, {
        err: 'An error occurred',
      });
  });

  test('renders the form elements correctly', () => {
    render(<Recommendations />);
    expect(
      screen.getByPlaceholderText('Enter movie summary')
    ).toBeInTheDocument();
    expect(screen.getByText('Get Recommendation')).toBeInTheDocument();
  });

  test('displays loading state when form is submitted', async () => {
    render(<Recommendations />);
    fireEvent.change(screen.getByPlaceholderText('Enter movie summary'), {
      target: {
        value:
          'A genie who grants wishes, but the third frees him to unleash chaos until a woman traps him.',
      },
    });
    fireEvent.click(screen.getByText('Get Recommendation'));

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('displays error message on failed API call', async () => {
    render(<Recommendations />);
    fireEvent.change(screen.getByPlaceholderText('Enter movie summary'), {
      target: { value: 'This API call fails' },
    });
    fireEvent.click(screen.getByText('Get Recommendation'));

    await waitFor(() =>
      expect(screen.getByText('An error occurred')).toBeInTheDocument()
    );
  });

  test('displays movie recommendation on successful API call', async () => {
    render(<Recommendations />);
    fireEvent.change(screen.getByPlaceholderText('Enter movie summary'), {
      target: {
        value:
          'A genie who grants wishes, but the third frees him to unleash chaos until a woman traps him.',
      },
    });
    fireEvent.click(screen.getByText('Get Recommendation'));

    await waitFor(() =>
      expect(screen.getByText('Recommendation:')).toBeInTheDocument()
    );
    expect(
      screen.getByText(
        'Wishmaster - A malevolent genie wreaks havoc after being freed, leading to a battle between his dark desires and those trying to stop him.'
      )
    ).toBeInTheDocument();
  });

  test('clears previous results and error messages on new submission', async () => {
    render(<Recommendations />);
    fireEvent.change(screen.getByPlaceholderText('Enter movie summary'), {
      target: { value: 'This API call fails' },
    });
    fireEvent.click(screen.getByText('Get Recommendation'));

    await waitFor(() =>
      expect(screen.getByText('An error occurred')).toBeInTheDocument()
    );

    fireEvent.change(screen.getByPlaceholderText('Enter movie summary'), {
      target: {
        value:
          'A genie who grants wishes, but the third frees him to unleash chaos until a woman traps him.',
      },
    });
    fireEvent.click(screen.getByText('Get Recommendation'));

    await waitFor(() =>
      expect(screen.queryByText('An error occurred')).not.toBeInTheDocument()
    );
    await waitFor(() =>
      expect(screen.getByText('Recommendation:')).toBeInTheDocument()
    );
    expect(
      screen.getByText(
        'Wishmaster - A malevolent genie wreaks havoc after being freed, leading to a battle between his dark desires and those trying to stop him.'
      )
    ).toBeInTheDocument();
  });
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  listApprovedReviews,
  getReviewEligibility,
  createVerifiedReview,
} from '../server/lib/reviewsService.js';
import { alsoBoughtProductIds, buyAgainProductIds } from '../server/lib/recommendationsService.js';
import { listProductQuestions, askProductQuestion } from '../server/lib/productQaService.js';

test('listApprovedReviews returns [] when table is missing', async () => {
  const db = {
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        order() { return this; },
        limit() {
          return Promise.resolve({
            data: null,
            error: { code: '42P01', message: 'relation "product_reviews" does not exist' },
          });
        },
      };
    },
  };
  assert.deepEqual(await listApprovedReviews(db, 'fresh-1'), []);
});

test('getReviewEligibility requires delivered order containing product', async () => {
  const db = {
    from(table) {
      if (table === 'orders') {
        return {
          select() { return this; },
          eq() { return this; },
          order() { return this; },
          limit() {
            return Promise.resolve({
              data: [
                {
                  id: 'ord-1',
                  status: 'delivered',
                  order_items: [{ product_id: 'fresh-1' }],
                },
              ],
              error: null,
            });
          },
        };
      }
      if (table === 'product_reviews') {
        return {
          select() { return this; },
          eq() { return this; },
          in() {
            return Promise.resolve({ data: [], error: null });
          },
        };
      }
      throw new Error(table);
    },
  };
  const result = await getReviewEligibility(db, 'fresh-1', 'user-1');
  assert.equal(result.eligible, true);
  assert.equal(result.orderId, 'ord-1');
});

test('createVerifiedReview rejects non-delivered orders', async () => {
  const db = {
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        maybeSingle() {
          return {
            data: {
              id: 'ord-1',
              user_id: 'user-1',
              status: 'placed',
              order_items: [{ product_id: 'fresh-1' }],
            },
            error: null,
          };
        },
      };
    },
  };
  const result = await createVerifiedReview(db, {
    productId: 'fresh-1',
    orderId: 'ord-1',
    userId: 'user-1',
    rating: 5,
    body: 'Great',
  });
  assert.equal(result.status, 400);
});

test('alsoBought and buyAgain degrade to empty on errors', async () => {
  const bad = {
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        in() { return this; },
        neq() { return this; },
        order() { return this; },
        limit() { return Promise.reject(new Error('offline')); },
      };
    },
  };
  assert.deepEqual(await alsoBoughtProductIds(bad, 'x'), []);
  assert.deepEqual(await buyAgainProductIds(bad, 'u'), []);
});

test('product Q&A degrades when table missing', async () => {
  const db = {
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        order() { return this; },
        limit() {
          return Promise.resolve({
            data: null,
            error: { code: 'PGRST205', message: 'Could not find the table product_questions' },
          });
        },
        insert() {
          return {
            select() {
              return {
                single() {
                  return {
                    data: null,
                    error: { code: '42P01', message: 'product_questions does not exist' },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
  assert.deepEqual(await listProductQuestions(db, 'p1'), []);
  const asked = await askProductQuestion(db, {
    productId: 'p1',
    userId: 'u1',
    question: 'Is this fresh?',
  });
  assert.equal(asked.status, 503);
});

/*
  Copyright 2012 the JSDoc Authors.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
/* global jsdoc */
import { name } from '@jsdoc/core';
import _ from 'lodash';

import * as doclet from '../../../lib/doclet.js';

const { Doclet } = doclet;
const { SCOPE } = name;

describe('@jsdoc/doclet/lib/doclet', () => {
  // TODO: more tests
  it('exists', () => {
    expect(doclet).toBeObject();
  });

  it('has a combineDoclets method', () => {
    expect(doclet.combineDoclets).toBeFunction();
  });

  it('has a Doclet class', () => {
    expect(doclet.Doclet).toBeFunction();
  });

  describe('Doclet', () => {
    const docSet = jsdoc.getDocSetFromFile('test/fixtures/doclet.js');
    const testDoclet = docSet.getByLongname('test2')[0];

    it('does not mangle Markdown in a description that uses leading asterisks', () => {
      expect(testDoclet.description.includes('* List item 1')).toBeTrue();
      expect(testDoclet.description.includes('**Strong** is strong')).toBeTrue();
    });

    it('adds the AST node as a non-enumerable property', () => {
      const descriptor = Object.getOwnPropertyDescriptor(testDoclet.meta.code, 'node');

      expect(descriptor.enumerable).toBeFalse();
    });

    // TODO: more tests (namespaces, modules, etc.)
    describe('name resolution', () => {
      // TODO: Load fixtures instead of creating doclets manually
      function makeDoclet(tagStrings) {
        const comment = `/**\n${tagStrings.join('\n')}\n*/`;

        return new Doclet(comment, {}, jsdoc.deps);
      }

      describe('aliases', () => {
        // TODO: This comment implies that we _don't_ need to set doclet.name...
        // If `doclet.alias` is defined, `doclet.name` will be set to the same value by the
        // time the test runs. Therefore, we set both `@alias` and `@name` in these tests.
        it('can resolve aliases that identify instance members', () => {
          const newDoclet = makeDoclet(['@alias Foo#bar', '@name Foo#bar']);

          expect(newDoclet.name).toBe('bar');
          expect(newDoclet.memberof).toBe('Foo');
          expect(newDoclet.scope).toBe('instance');
          expect(newDoclet.longname).toBe('Foo#bar');
        });

        it('can resolve aliases that identify static members', () => {
          const newDoclet = makeDoclet(['@alias Foo.bar', '@name Foo.bar']);

          expect(newDoclet.name).toBe('bar');
          expect(newDoclet.memberof).toBe('Foo');
          expect(newDoclet.scope).toBe('static');
          expect(newDoclet.longname).toBe('Foo.bar');
        });

        it('works when the alias only specifies the short name', () => {
          const newDoclet = makeDoclet(['@alias bar', '@name bar', '@memberof Foo', '@instance']);

          expect(newDoclet.name).toBe('bar');
          expect(newDoclet.memberof).toBe('Foo');
          expect(newDoclet.scope).toBe('instance');
          expect(newDoclet.longname).toBe('Foo#bar');
        });
      });

      describe('events', () => {
        const event = '@event';
        const memberOf = '@memberof MyClass';
        const eventName = '@name A';

        // Test the basic @event that is not nested.
        it('unnested @event gets resolved correctly', () => {
          const newDoclet = makeDoclet([event, eventName]);

          expect(newDoclet.name).toBe('A');
          expect(newDoclet.memberof).toBeUndefined();
          expect(newDoclet.longname).toBe('event:A');
        });

        // test all permutations of @event @name [name] @memberof.
        it('@event @name @memberof resolves correctly', () => {
          const newDoclet = makeDoclet([event, eventName, memberOf]);

          expect(newDoclet.name).toBe('A');
          expect(newDoclet.memberof).toBe('MyClass');
          expect(newDoclet.longname).toBe('MyClass.event:A');
        });

        it('@event @memberof @name resolves correctly', () => {
          const newDoclet = makeDoclet([event, memberOf, eventName]);

          expect(newDoclet.name).toBe('A');
          expect(newDoclet.memberof).toBe('MyClass');
          expect(newDoclet.longname).toBe('MyClass.event:A');
        });

        it('@name @event @memberof resolves correctly', () => {
          const newDoclet = makeDoclet([eventName, event, memberOf]);

          expect(newDoclet.name).toBe('A');
          expect(newDoclet.memberof).toBe('MyClass');
          expect(newDoclet.longname).toBe('MyClass.event:A');
        });

        it('@name @memberof @event resolves correctly', () => {
          const newDoclet = makeDoclet([eventName, memberOf, event]);

          expect(newDoclet.name).toBe('A');
          expect(newDoclet.memberof).toBe('MyClass');
          expect(newDoclet.longname).toBe('MyClass.event:A');
        });

        it('@memberof @event @name resolves correctly', () => {
          const newDoclet = makeDoclet([memberOf, event, eventName]);

          expect(newDoclet.name).toBe('A');
          expect(newDoclet.memberof).toBe('MyClass');
          expect(newDoclet.longname).toBe('MyClass.event:A');
        });

        it('@memberof @name @event resolves correctly', () => {
          const newDoclet = makeDoclet([memberOf, eventName, event]);

          expect(newDoclet.name).toBe('A');
          expect(newDoclet.memberof).toBe('MyClass');
          expect(newDoclet.longname).toBe('MyClass.event:A');
        });

        // test all permutations of @event [name]  @memberof
        it('@event [name] @memberof resolves correctly', () => {
          const newDoclet = makeDoclet(['@event A', memberOf]);

          expect(newDoclet.name).toBe('A');
          expect(newDoclet.memberof).toBe('MyClass');
          expect(newDoclet.longname).toBe('MyClass.event:A');
        });

        it('@memberof @event [name] resolves correctly', () => {
          const newDoclet = makeDoclet([memberOf, '@event A']);

          expect(newDoclet.name).toBe('A');
          expect(newDoclet.memberof).toBe('MyClass');
          expect(newDoclet.longname).toBe('MyClass.event:A');
        });

        // test full @event A.B
        it('full @event definition works', () => {
          const newDoclet = makeDoclet(['@event MyClass.A']);

          expect(newDoclet.name).toBe('A');
          expect(newDoclet.memberof).toBe('MyClass');
          expect(newDoclet.longname).toBe('MyClass.event:A');
        });

        it('full @event definition with event: works', () => {
          const newDoclet = makeDoclet(['@event MyClass.event:A']);

          expect(newDoclet.name).toBe('event:A');
          expect(newDoclet.memberof).toBe('MyClass');
          expect(newDoclet.longname).toBe('MyClass.event:A');
        });

        // TODO: This only works if you resolve the names twice. As it happens,
        // JSDoc does that, because it calls `Doclet#postProcess` twice, so this works in
        // practice. But you shouldn't have to resolve the names twice...
        xit('@event @name MyClass.EventName @memberof somethingelse works', () => {
          const newDoclet = makeDoclet([event, '@name MyClass.A', '@memberof MyNamespace']);

          expect(newDoclet.name).toBe('A');
          expect(newDoclet.memberof).toBe('MyNamespace.MyClass');
          expect(newDoclet.longname).toBe('MyNamespace.MyClass.event:A');
        });
      });

      describe('module members', () => {
        // TODO: This only works if you resolve the names twice. As it happens,
        // JSDoc does that, because it calls `Doclet#postProcess` twice, so this works in
        // practice. But you shouldn't have to resolve the names twice...
        xit('@name @function @memberof works', () => {
          const newDoclet = makeDoclet([
            '@name Bar.prototype.baz',
            '@function',
            '@memberof module:foo',
            '@param {string} qux',
          ]);

          expect(newDoclet.name).toBe('baz');
          expect(newDoclet.memberof).toBe('module:foo.Bar');
          expect(newDoclet.longname).toBe('module:foo.Bar#baz');
        });
      });
    });
  });

  describe('setScope', () => {
    it('accepts the correct scope names', () => {
      function setScope(scopeName) {
        const newDoclet = new Doclet('/** Huzzah, a doclet! */', null, jsdoc.deps);

        newDoclet.setScope(scopeName);
      }

      _.values(SCOPE.NAMES).forEach((scopeName) => {
        expect(setScope.bind(null, scopeName)).not.toThrow();
      });
    });

    it('throws an error for invalid scope names', () => {
      function setScope() {
        const newDoclet = new Doclet('/** Woe betide this doclet. */', null, jsdoc.deps);

        newDoclet.setScope('fiddlesticks');
      }

      expect(setScope).toThrow();
    });
  });

  describe('combineDoclets', () => {
    it('overrides most properties of the secondary doclet', () => {
      const primaryDoclet = new Doclet(
        '/** New and improved!\n@version 2.0.0 */',
        null,
        jsdoc.deps
      );
      const secondaryDoclet = new Doclet('/** Hello!\n@version 1.0.0 */', null, jsdoc.deps);
      const newDoclet = doclet.combineDoclets(primaryDoclet, secondaryDoclet);

      Object.getOwnPropertyNames(newDoclet).forEach((property) => {
        expect(newDoclet[property]).toEqual(primaryDoclet[property]);
      });
    });

    it('adds properties from the secondary doclet that are missing', () => {
      const primaryDoclet = new Doclet('/** Hello!\n@version 2.0.0 */', null, jsdoc.deps);
      const secondaryDoclet = new Doclet('/** Hello! */', null, jsdoc.deps);
      const newDoclet = doclet.combineDoclets(primaryDoclet, secondaryDoclet);

      expect(newDoclet.version).toBe('2.0.0');
    });

    describe('params and properties', () => {
      const properties = ['params', 'properties'];

      it('uses params and properties from the secondary doclet if the primary lacks them', () => {
        const primaryDoclet = new Doclet('/** Hello! */', null, jsdoc.deps);
        const secondaryComment = [
          '/**',
          ' * @param {string} foo - The foo.',
          ' * @property {number} bar - The bar.',
          ' */',
        ].join('\n');
        const secondaryDoclet = new Doclet(secondaryComment, null, jsdoc.deps);
        const newDoclet = doclet.combineDoclets(primaryDoclet, secondaryDoclet);

        properties.forEach((property) => {
          expect(newDoclet[property]).toEqual(secondaryDoclet[property]);
        });
      });

      it('uses params and properties from the primary doclet, if present', () => {
        const primaryComment = [
          '/**',
          ' * @param {number} baz - The baz.',
          ' * @property {string} qux - The qux.',
          ' */',
        ].join('\n');
        const primaryDoclet = new Doclet(primaryComment, null, jsdoc.deps);
        const secondaryComment = [
          '/**',
          ' * @param {string} foo - The foo.',
          ' * @property {number} bar - The bar.',
          ' */',
        ].join('\n');
        const secondaryDoclet = new Doclet(secondaryComment, null, jsdoc.deps);
        const newDoclet = doclet.combineDoclets(primaryDoclet, secondaryDoclet);

        properties.forEach((property) => {
          expect(newDoclet[property]).toEqual(primaryDoclet[property]);
        });
      });
    });
  });
});

module.exports = function phoneAuthPlugin({ types: t }) {
  const isTarget = (state) => /[\\/]App\.tsx$/.test(state.file.opts.filename || '');

  return {
    name: 'tanazul-phone-auth-panel',
    visitor: {
      Program(path, state) {
        if (!isTarget(state)) return;
        const alreadyImported = path.node.body.some(
          (node) => t.isImportDeclaration(node) && node.source.value === './PhoneLoginPanel',
        );
        if (!alreadyImported) {
          path.unshiftContainer(
            'body',
            t.importDeclaration(
              [t.importDefaultSpecifier(t.identifier('PhoneLoginPanel'))],
              t.stringLiteral('./PhoneLoginPanel'),
            ),
          );
        }
      },

      FunctionDeclaration(path, state) {
        if (!isTarget(state) || path.node.id?.name !== 'LoginPanel') return;

        const onLoginProperty = t.objectProperty(
          t.identifier('onLogin'),
          t.identifier('onLogin'),
          false,
          true,
        );
        const props = t.objectPattern([onLoginProperty]);
        const opening = t.jsxOpeningElement(
          t.jsxIdentifier('PhoneLoginPanel'),
          [
            t.jsxAttribute(
              t.jsxIdentifier('onLogin'),
              t.jsxExpressionContainer(t.identifier('onLogin')),
            ),
          ],
          true,
        );
        const component = t.jsxElement(opening, null, [], true);
        const replacement = t.functionDeclaration(
          t.identifier('LoginPanel'),
          [props],
          t.blockStatement([t.returnStatement(component)]),
        );

        path.replaceWith(replacement);
        path.skip();
      },
    },
  };
};

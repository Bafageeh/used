module.exports = function phoneAuthPlugin({ types: t }) {
  const isTarget = (state) => /[\\/]App\.tsx$/.test(state.file.opts.filename || '');

  return {
    name: 'tanazul-phone-auth-panel',
    visitor: {
      Program(path, state) {
        if (!isTarget(state)) return;

        const hasPanelImport = path.node.body.some(
          (node) => t.isImportDeclaration(node) && node.source.value === './PhoneLoginPanel',
        );
        if (!hasPanelImport) {
          path.unshiftContainer(
            'body',
            t.importDeclaration(
              [t.importDefaultSpecifier(t.identifier('PhoneLoginPanel'))],
              t.stringLiteral('./PhoneLoginPanel'),
            ),
          );
        }

        const hasCreateElementImport = path.node.body.some(
          (node) => t.isImportDeclaration(node)
            && node.source.value === 'react'
            && node.specifiers.some((specifier) => t.isImportSpecifier(specifier) && specifier.imported?.name === 'createElement'),
        );
        if (!hasCreateElementImport) {
          path.unshiftContainer(
            'body',
            t.importDeclaration(
              [
                t.importSpecifier(
                  t.identifier('__tanazulCreateElement'),
                  t.identifier('createElement'),
                ),
              ],
              t.stringLiteral('react'),
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
        const component = t.callExpression(
          t.identifier('__tanazulCreateElement'),
          [
            t.identifier('PhoneLoginPanel'),
            t.objectExpression([
              t.objectProperty(t.identifier('onLogin'), t.identifier('onLogin')),
            ]),
          ],
        );
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

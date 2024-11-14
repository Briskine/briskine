import {parseWithoutProcessing} from 'handlebars'

function findFeaturesInAST (obj = {}, features = { partials: false, account: false }) {
  for (const key of Object.keys(obj)) {
    // if we already found both features, return
    if (
      features.partials === true
      && features.account === true
    ) {
      return features
    }

    // find partials
    if (obj[key]?.type === 'PartialStatement') {
      features.partials = true
    }

    // find account variable
    if (
      obj[key]?.type === 'PathExpression'
      && obj[key]?.parts?.[0] === 'account'
    ) {
      features.account = true
    }

    if (
      typeof obj[key] === 'object'
      && obj[key] !== null
      && (
        Array.isArray(obj)
        || key === 'program'
        || key === 'body'
        || key === 'path'
        || key === 'params'
      )
    ) {
      findFeaturesInAST(obj[key], features)
    }
  }

  return features
}

export default function templateFeatures (template = '') {
  const ast = parseWithoutProcessing(template)
  return findFeaturesInAST(ast.body)
}

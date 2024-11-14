import {parseWithoutProcessing} from 'handlebars'

function findFeaturesInAST (obj = {}, features = {
  partials: false,
  account: false,
  from: false,
}) {
  for (const key of Object.keys(obj)) {
    // if we already found both features, return
    if (
      features.partials === true
      && features.account === true
      && features.from === true
    ) {
      return features
    }

    // find partials
    if (obj[key]?.type === 'PartialStatement') {
      features.partials = true
    }

    // find from or account variables
    if (obj[key]?.type === 'PathExpression') {
      if (obj[key]?.parts?.[0] === 'account') {
        features.account = true
      }

      if (obj[key]?.parts?.[0] === 'from') {
        features.from = true
      }
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

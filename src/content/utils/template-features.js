const defaultFeatures = {
  partials: false,
  account: false,
}

function findFeaturesInAST (obj = {}, features = { ...defaultFeatures }) {
  for (const key of Object.keys(obj)) {
    // if we already found all features, return
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

    // find from or account variables
    if (obj[key]?.type === 'PathExpression') {
      const firstPart = obj[key]?.parts?.[0]
      if (firstPart === 'account' || firstPart === 'from') {
        features.account = true
      }
    }

    if (
      typeof obj[key] === 'object'
      && obj[key] !== null
      // exclude loc and strip objects
      && (
        key !== 'loc'
        && key !== 'strip'
      )
    ) {
      findFeaturesInAST(obj[key], features)
    }
  }

  return features
}

export default function templateFeatures (ast = {}) {
  try {
    return findFeaturesInAST(ast.body)
  } catch {
    return defaultFeatures
  }
}

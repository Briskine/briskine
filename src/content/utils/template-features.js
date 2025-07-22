const defaultFeatures = {
  partials: false,
}

function findFeaturesInAST (obj = {}, features = { ...defaultFeatures }) {
  for (const key of Object.keys(obj)) {
    // if we already found all features, return
    if (
      features.partials === true
    ) {
      return features
    }

    // find partials
    if (obj[key]?.type === 'PartialStatement') {
      features.partials = true
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

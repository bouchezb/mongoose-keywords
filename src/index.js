import _ from 'lodash'
import { Query, SchemaTypes, Schema, SchemaType } from 'mongoose'

const normalize = (value, path) => _.kebabCase(value).replace(/\-/g, ' ')

const keywordsPlugin = (schema, {paths, field = '_keywords', transform = normalize} = {}) => {
  paths = paths && paths.map((p) => schema.path(p))

  if (!paths || !paths.length) return

  schema.add({
    [field]: _.assign({}, schema.tree[field], {
      type: [String],
      index: true
    })
  })

  paths.forEach((path) => {
    // console.log(schema)
    schema.path(path.path).set(function (value) {
      // console.log(`${path.path}(type of ${path.constructor}) => ${value}`)
      if (this instanceof Query) {
        return value
      }
      const oldValue = this[path.path]
      if (value === oldValue) return value

      const parsePath = (path, value) => {
        if (path instanceof SchemaTypes.ObjectId) {
          value[field] && value[field].forEach((keyword) => {
            oldValue && oldValue[field] && this[field].pull(...oldValue[field])
            this[field].addToSet(keyword)
          })
        } else if (path.instanceOfSchema) {
          value[field] && value[field].forEach((keyword) => {
            oldValue && oldValue[field] && this[field].pull(...oldValue[field])
            this[field].addToSet(keyword)
          })
        } else {
          oldValue && this[field].pull(transform(oldValue, path))
          this[field] && this[field].addToSet(transform(value, path))
        }
      }

      if (path instanceof SchemaTypes.Array) {
        value.forEach((val) => {
          parsePath(path.caster, val)
        })
      } else if (path.$isMongooseDocumentArray) {
        value.forEach((val) => {
          parsePath(path.caster.schema, val)
        })
      } else {
        parsePath(path, value)
      }

      return value
    })
  })
}

export default keywordsPlugin

module.exports = exports = keywordsPlugin
module.exports.normalize = normalize

// Nexus Realms - Exportador temporal de todos los EntityType registrados.
//
// Uso:
//   /reload
//   /nexus_export_entities
//
// Resultado:
//   minecraft/kubejs/nexus_entity_ids.json

(function () {
  var NexusExportForgeRegistries = Java.loadClass(
    'net.minecraftforge.registries.ForgeRegistries'
  )

  ServerEvents.commandRegistry(function (event) {
    var commands = event.commands

    event.register(
      commands
        .literal('nexus_export_entities')
        .requires(function (source) {
          return source.hasPermission(2)
        })
        .executes(function (context) {
          try {
            var entityIds = []
            var entitiesByNamespace = {}

            var entityIterator =
              NexusExportForgeRegistries
                .ENTITY_TYPES
                .getKeys()
                .iterator()

            while (entityIterator.hasNext()) {
              var entityId =
                String(entityIterator.next())

              entityIds.push(entityId)

              var separatorIndex =
                entityId.indexOf(':')

              var namespace =
                separatorIndex >= 0
                  ? entityId.substring(
                      0,
                      separatorIndex
                    )
                  : 'unknown'

              if (!entitiesByNamespace[namespace]) {
                entitiesByNamespace[namespace] = []
              }

              entitiesByNamespace[
                namespace
              ].push(entityId)
            }

            entityIds.sort()

            var namespaceNames =
              Object.keys(
                entitiesByNamespace
              )

            namespaceNames.sort()

            var sortedNamespaces = {}

            for (
              var index = 0;
              index < namespaceNames.length;
              index += 1
            ) {
              var currentNamespace =
                namespaceNames[index]

              entitiesByNamespace[
                currentNamespace
              ].sort()

              sortedNamespaces[
                currentNamespace
              ] =
                entitiesByNamespace[
                  currentNamespace
                ]
            }

            JsonIO.write(
              'kubejs/nexus_entity_ids.json',
              {
                generated_at:
                  String(
                    new Date()
                  ),

                total:
                  entityIds.length,

                namespaces:
                  sortedNamespaces,

                all_entities:
                  entityIds
              }
            )

            context.source.sendSuccess(
              Text.of(
                'Exportadas ' +
                entityIds.length +
                ' entidades en kubejs/nexus_entity_ids.json'
              ).green(),
              false
            )

            console.info(
              '[Nexus Entity Export] Exportadas ' +
              entityIds.length +
              ' entidades en kubejs/nexus_entity_ids.json'
            )

            return 1
          } catch (error) {
            context.source.sendFailure(
              Text.of(
                'No se pudo exportar el registro. Revisa kubejs/server.log'
              ).red()
            )

            console.error(
              '[Nexus Entity Export] Error al exportar entidades.'
            )

            console.error(error)

            return 0
          }
        })
    )
  })
})()
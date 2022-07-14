require_relative "boot"

require "action_controller/railtie"

Bundler.require(*Rails.groups)

module Blog
  class Application < Rails::Application
    COLOR = '#C00'

    config.load_defaults 6.1
    config.eager_load = true
  end
end

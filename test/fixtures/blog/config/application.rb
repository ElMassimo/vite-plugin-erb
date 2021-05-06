require_relative "boot"

require "rails"

Bundler.require(*Rails.groups)

module Blog
  class Application < Rails::Application
    config.load_defaults 6.1
  end
end

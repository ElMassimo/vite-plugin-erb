#!/usr/bin/env ruby
# frozen_string_literal: true

# Used to easily extract the rendered template from the output of this script.
delimiter = ARGV[0] || raise("No output delimiter was provided.")

# Detect the available ERB engines (unless manually specified).
engines = {
  'erubi'  => ->(code) { eval Erubi::Engine.new(code).src },
  'erubis' => ->(code) { Erubis::Eruby.new(code).result },
  'erb'    => ->(code) { ERB.new(code).result },
}
engine = ARGV[1] || engines.keys.find { |name| Gem.loaded_specs[name] } || 'erb'
require engine

# Render the template and enclose it in delimiters to be extracted later.
code = STDIN.read
renderer = engines.fetch(engine)
puts "#{delimiter}#{renderer.call(code)}#{delimiter}"
puts 'Rendered!'
exit(0)

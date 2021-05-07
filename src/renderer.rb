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
puts "Engine: #{engine}"
require engine

# Render the template and enclose it in delimiters to be extracted later.
code = STDIN.read
puts "Code:\n#{code}"
renderer = engines.fetch(engine)
puts "#{delimiter}#{renderer.call(code)}#{delimiter}"
puts "Rendered in #{ Process.pid }, which is a child of #{ Process.ppid }"
exit(0)

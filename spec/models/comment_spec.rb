require 'rails_helper'

RSpec.describe Comment, type: :model do
  let(:comment) { create(:comment) }

  describe '#content_as_html' do
    it 'returns empty string for blank content' do
      comment.content = ''
      expect(comment.content_as_html).to eq('')
    end

    it 'renders basic markdown syntax correctly' do
      comment.content = "# Title\n* List item\n* Another item"
      rendered = comment.content_as_html
      expect(rendered).to include('<h1>Title</h1>')
      expect(rendered).to include('<ul>')
      expect(rendered).to include('<li>List item</li>')
    end

    it 'renders links correctly' do
      comment.content = '[Link](http://example.com)'
      expect(comment.content_as_html).to include('<a href="http://example.com">Link</a>')
    end

    it 'renders code blocks with syntax highlighting' do
      comment.content = "```ruby\ndef hello\n  puts 'world'\nend\n```"
      rendered = comment.content_as_html
      expect(rendered).to include('<pre>')
      expect(rendered).to include('<code class="ruby">')
    end

    it 'escapes HTML tags in content' do
      comment.content = '<script>alert("xss")</script>'
      expect(comment.content_as_html).not_to include('<script>')
    end

    it 'handles special characters properly' do
      comment.content = '& < > " \''
      rendered = comment.content_as_html
      expect(rendered).to include('&amp;')
      expect(rendered).to include('&lt;')
      expect(rendered).to include('&gt;')
    end

    it 'prevents XSS attacks' do
      malicious_content = <<-CONTENT
<script>alert('xss')</script>
[click me](javascript:alert('xss'))
<img src="x" onerror="alert('xss')">
CONTENT
      rendered = comment.content_as_html
      expect(rendered).not_to include('<script>')
      expect(rendered).not_to include('javascript:')
      expect(rendered).not_to include('onerror')
    end

    it 'allows safe HTML elements and attributes' do
      comment.content = "**bold** *italic* [link](http://example.com)"
      rendered = comment.content_as_html
      expect(rendered).to include('<strong>bold</strong>')
      expect(rendered).to include('<em>italic</em>')
      expect(rendered).to include('<a href="http://example.com">link</a>')
    end
  end
end
/***
 * language v
 * @param {typeof import("highlight.js").default} hljs
 */
export default function (hljs) {
  const LITERALS = [
    "true",
    "false"
  ];
  const TYPES = ['bool', 'byteptr', 'chan', 'char', 'charptr', 'f32', 'f64', 'float', 'i16', 'i64', 'i8', 'int', 'int', 'isize', 'MessageError', 'none', 'rune', 'u16', 'u32', 'u64', 'u8', 'usize', 'voidptr'];
  const KWS = [
    'as', 'asm', 'assert', 'atomic', 'break', 'chan', 'const', 'continue', 'defer', 'else', 'embed', 'enum', 'fn', 'for', 'goto', 'if', 'import', 'in', 'interface', 'is', 'lock', 'match', 'module', 'mut', 'none', 'or', 'pub', 'return', 'rlock', 'select', 'shared', 'sizeof', 'static', 'struct', 'type', 'union', 'unsafe', 'else', 'for', 'if',  'include'
  ];
  const BUILT_INS = [
    'free','str','reduce','string','join','join_lines','sort_by_len','sort_ignore_case','byterune','bytestr','clone','hex','utf8_to_utf32','vbytes','vstring','vstring_literal','vstring_literal_with_len','vstring_with_len','close','try_pop','try_push','strg','strsci','strlong','eq_epsilon','hex_full','hex2','msg','code','repeat','bytes','length_in_bytes','ascii_str','is_alnum','is_bin_digit','is_capital','is_digit','is_hex_digit','is_letter','is_oct_digit','is_space','str_escaped','repeat_to_depth','insert','prepend','delete','delete_many','clear','trim','drop','first','last','pop','delete_last','clone_to_depth','push_many','reverse_in_place','reverse','filter','any','all','map','sort','sort_with_compare','contains','index','grow_cap','grow_len','pointers','move','reserve','keys','values','print','after','after_char','all_after','all_after_first','all_after_last','all_before','all_before_last','before','bool','capitalize','compare','contains_any','contains_any_substr','contains_only','contains_u8','count','ends_with','f32','f64','fields','find_between','hash','i16','i64','i8','indent_width','index_after','index_any','index_u8','int','is_ascii','is_blank','is_lower','is_title','is_upper','last_index','last_index_u8','len_utf8','limit','match_glob','normalize_tabs','parse_int','parse_uint','replace','replace_char','replace_each','replace_once','rsplit','rsplit_any','rsplit_nth','rsplit_once','runes','split','split_any','split_into_lines','split_nth','split_once','starts_with','starts_with_capital','strip_margin','strip_margin_custom','substr','substr_ni','substr_with_check','title','to_lower','to_upper','to_wide','trim_indent','trim_indexes','trim_left','trim_prefix','trim_right','trim_space','trim_string_left','trim_string_right','trim_suffix','u16','u32','u64','u8','utf32_code'
  ];

  const KEYWORDS = {
    keyword: KWS,
    type: TYPES,
    literal: LITERALS,
    built_in: BUILT_INS
  };

  return {
    name: 'v',
    aliases: [ 'vlang' ],
    keywords: KEYWORDS,
    illegal: '</',
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      {
        className: 'string',
        variants: [
          hljs.QUOTE_STRING_MODE,
          hljs.APOS_STRING_MODE,
          {
            begin: '`',
            end: '`'
          }
        ]
      },
      {
        className: 'number',
        variants: [
          {
            begin: hljs.C_NUMBER_RE + '[i]',
            relevance: 1
          },
          hljs.C_NUMBER_MODE
        ]
      },
      { begin: /:=/ // relevance booster
      },
      {
        className: 'function',
        beginKeywords: 'fn',
        end: '\\s*(\\{|$)',
        excludeEnd: true,
        contains: [
          hljs.TITLE_MODE,
          {
            className: 'params',
            begin: /\(/,
            end: /\)/,
            endsParent: true,
            keywords: KEYWORDS,
            illegal: /["']/
          }
        ]
      }
    ]
  };
}

